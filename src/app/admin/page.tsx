"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Printer, CheckCircle, Clock, Pencil, Hourglass, CheckCheck, XCircle } from "lucide-react";
import { EditTicketModal } from "@/components/EditTicketModal";

interface Ticket {
  id: number;
  so_phieu: number;
  ngay_mua: string;
  ten_khach_hang: string;
  model_name: string;
  serial: string | null;
  nguoi_dang_ky: string | null;
  trang_thai: string;
  created_at: string;
}

const TABS = [
  { key: "cho_duyet", label: "Chờ duyệt", icon: Hourglass, color: "text-orange-600" },
  { key: "cho_in", label: "Chờ in", icon: Clock, color: "text-amber-600" },
  { key: "da_in", label: "Đã in", icon: CheckCircle, color: "text-emerald-600" },
];

export default function AdminDashboardPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<string>("cho_duyet");
  const [search, setSearch] = useState<string>("");
  const [editId, setEditId] = useState<number | null>(null);
  const [role, setRole] = useState<string>("");
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => r.json())
      .then((d) => setRole(d.role || ""))
      .catch(() => {});
  }, []);

  const fetchTickets = () => {
    setLoading(true);
    fetch(`/api/tickets?status=${filter}&q=${encodeURIComponent(search)}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTickets(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load tickets", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTickets();
  }, [filter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTickets();
  };

  const changeStatus = async (id: number, trang_thai: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trang_thai }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || "Cập nhật thất bại.");
      } else {
        fetchTickets();
      }
    } catch {
      alert("Không kết nối được server.");
    } finally {
      setBusyId(null);
    }
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  };

  const isAdmin = role === "admin";

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 w-full flex-1 flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Phiếu Bảo hành</h1>
          <p className="text-slate-500 text-sm mt-1">Duyệt yêu cầu và in phiếu khớp phôi giấy A5</p>
        </div>

        <div className="flex bg-slate-200 p-1 rounded-lg">
          {TABS.map(({ key, label, icon: Icon, color }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition ${
                filter === key ? `bg-white ${color} shadow-sm` : "text-slate-600 hover:text-slate-800"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <form onSubmit={handleSearch} className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm số phiếu, tên khách, serial..."
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-md bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button type="submit" className="hidden">Search</button>
          </form>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Số phiếu</th>
                <th className="px-6 py-3">Ngày bán</th>
                <th className="px-6 py-3">Khách hàng</th>
                <th className="px-6 py-3">Người ĐK</th>
                <th className="px-6 py-3">Model</th>
                <th className="px-6 py-3">Serial</th>
                <th className="px-6 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500">Đang tải dữ liệu...</td></tr>
              ) : tickets.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500">Không có phiếu nào ở mục này.</td></tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-semibold text-slate-900">#{t.so_phieu}</td>
                    <td className="px-6 py-4">{formatDate(t.ngay_mua)}</td>
                    <td className="px-6 py-4 truncate max-w-[200px]" title={t.ten_khach_hang}>{t.ten_khach_hang}</td>
                    <td className="px-6 py-4 text-slate-500">{t.nguoi_dang_ky || "-"}</td>
                    <td className="px-6 py-4 font-medium">{t.model_name}</td>
                    <td className="px-6 py-4">{t.serial || "-"}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {isAdmin && (
                          <button
                            onClick={() => setEditId(t.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded text-sm font-medium hover:bg-slate-200 transition"
                          >
                            <Pencil className="h-4 w-4" />
                            Sửa
                          </button>
                        )}

                        {t.trang_thai === "cho_duyet" ? (
                          <>
                            <button
                              onClick={() => changeStatus(t.id, "cho_in")}
                              disabled={busyId === t.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded text-sm font-medium hover:bg-emerald-200 transition disabled:opacity-50"
                            >
                              <CheckCheck className="h-4 w-4" />
                              Duyệt
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Từ chối phiếu #${t.so_phieu}?`)) changeStatus(t.id, "huy");
                              }}
                              disabled={busyId === t.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded text-sm font-medium hover:bg-red-100 transition disabled:opacity-50"
                            >
                              <XCircle className="h-4 w-4" />
                              Từ chối
                            </button>
                          </>
                        ) : (
                          <Link
                            href={`/admin/print/${t.id}`}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition ${
                              t.trang_thai === "cho_in"
                                ? "bg-brand-100 text-brand-700 hover:bg-brand-200"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            <Printer className="h-4 w-4" />
                            {t.trang_thai === "cho_in" ? "In phôi" : "In lại"}
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editId !== null && (
        <EditTicketModal
          ticketId={editId}
          onClose={() => setEditId(null)}
          onSaved={() => {
            setEditId(null);
            fetchTickets();
          }}
        />
      )}
    </div>
  );
}
