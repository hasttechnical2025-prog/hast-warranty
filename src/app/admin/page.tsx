"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Printer, CheckCircle, Clock, Pencil, Hourglass, CheckCheck, XCircle, ClipboardList, AlertTriangle, FileSpreadsheet } from "lucide-react";
import { EditTicketModal } from "@/components/EditTicketModal";
import { ImportTicketsModal } from "@/components/ImportTicketsModal";

const STAT_CARDS = [
  { key: null as string | null, label: "Tổng phiếu", icon: ClipboardList, tint: "bg-brand-50 text-brand-600", field: "total" as const },
  { key: "cho_duyet", label: "Chờ duyệt", icon: Hourglass, tint: "bg-orange-50 text-orange-600", field: "cho_duyet" as const },
  { key: "cho_in", label: "Chờ in", icon: Clock, tint: "bg-amber-50 text-amber-600", field: "cho_in" as const },
  { key: "da_in", label: "Đã in", icon: CheckCircle, tint: "bg-emerald-50 text-emerald-600", field: "da_in" as const },
];

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

export default function AdminDashboardPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<string>("cho_duyet");
  const [search, setSearch] = useState<string>("");
  const [editId, setEditId] = useState<number | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [role, setRole] = useState<string>("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [counts, setCounts] = useState<{ cho_duyet: number; cho_in: number; da_in: number; total: number }>({
    cho_duyet: 0, cho_in: 0, da_in: 0, total: 0,
  });

  const fetchCounts = () => {
    fetch("/api/tickets/counts").then((r) => r.json()).then((d) => { if (d && !d.error) setCounts(d); }).catch(() => {});
  };

  useEffect(() => {
    fetch("/api/admin/me").then((r) => r.json()).then((d) => setRole(d.role || "")).catch(() => {});
    fetchCounts();
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
    fetchCounts();
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Quản lý Phiếu Bảo hành</h1>
        <p className="text-slate-500 text-sm mt-1">Chọn thẻ bên dưới để lọc — duyệt yêu cầu rồi in phiếu khớp phôi A5.</p>
      </div>

      {/* Banner: có phiếu chờ duyệt */}
      {counts.cho_duyet > 0 && (
        <button
          onClick={() => setFilter("cho_duyet")}
          className="mb-4 flex w-full items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-800 transition hover:bg-amber-100"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
          <span>
            <b>{counts.cho_duyet} yêu cầu</b> đang chờ duyệt — hãy duyệt trước khi in.
          </span>
        </button>
      )}

      {/* Thẻ KPI */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {STAT_CARDS.map(({ key, label, icon: Icon, tint, field }) => {
          const active = filter === key;
          return (
            <button
              key={label}
              onClick={() => key && setFilter(key)}
              className={`flex items-center gap-3 rounded-2xl border bg-white p-4 text-left shadow-sm transition ${
                key ? "hover:border-brand-300 cursor-pointer" : "cursor-default"
              } ${active ? "border-brand-500 ring-2 ring-brand-500/15" : "border-slate-200"}`}
            >
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tint}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-medium text-slate-500">{label}</span>
                <span className="block text-2xl font-bold text-slate-800">{counts[field]}</span>
              </span>
            </button>
          );
        })}
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

          {isAdmin && (
            <button
              onClick={() => setShowImport(true)}
              className="ml-3 inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Nhập dữ liệu cũ
            </button>
          )}
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Số phiếu</th>
                <th className="px-6 py-3">Ngày bán</th>
                <th className="px-6 py-3 min-w-[220px] w-[32%]">Khách hàng</th>
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
                    <td className="px-6 py-4 min-w-[220px] whitespace-normal break-words font-medium text-slate-800" title={t.ten_khach_hang}>{t.ten_khach_hang}</td>
                    <td className="px-6 py-4 text-slate-500">{t.nguoi_dang_ky || "-"}</td>
                    <td className="px-6 py-4 font-medium">{t.model_name}</td>
                    <td className="px-6 py-4">{t.serial || "-"}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {isAdmin && (
                          <button
                            onClick={() => setEditId(t.id)}
                            title="Sửa phiếu"
                            className="rounded-lg p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}

                        {t.trang_thai === "cho_duyet" ? (
                          <>
                            <button
                              onClick={() => changeStatus(t.id, "cho_in")}
                              disabled={busyId === t.id}
                              title="Duyệt"
                              className="rounded-lg p-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition disabled:opacity-50"
                            >
                              <CheckCheck className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Từ chối phiếu #${t.so_phieu}?`)) changeStatus(t.id, "huy");
                              }}
                              disabled={busyId === t.id}
                              title="Từ chối"
                              className="rounded-lg p-2 bg-red-50 text-red-600 hover:bg-red-100 transition disabled:opacity-50"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <Link
                            href={`/admin/print/${t.id}`}
                            title={t.trang_thai === "cho_in" ? "In phôi" : "In lại"}
                            className={`rounded-lg p-2 transition ${
                              t.trang_thai === "cho_in"
                                ? "bg-brand-100 text-brand-700 hover:bg-brand-200"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            <Printer className="h-4 w-4" />
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

      {showImport && (
        <ImportTicketsModal onClose={() => setShowImport(false)} onImported={fetchTickets} />
      )}
    </div>
  );
}
