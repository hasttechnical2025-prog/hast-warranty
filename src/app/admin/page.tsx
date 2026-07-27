"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Printer, CheckCircle, Clock, Pencil } from "lucide-react";
import { EditTicketModal } from "@/components/EditTicketModal";

interface Ticket {
  id: number;
  so_phieu: number;
  ngay_mua: string;
  ten_khach_hang: string;
  model_name: string;
  serial: string | null;
  trang_thai: string;
  created_at: string;
}

export default function AdminDashboardPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<string>("cho_in");
  const [search, setSearch] = useState<string>("");
  const [editId, setEditId] = useState<number | null>(null);

  const fetchTickets = () => {
    setLoading(true);
    fetch(`/api/tickets?status=${filter}&q=${encodeURIComponent(search)}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTickets(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load tickets", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTickets();
  }, [filter]); // search is handled by manual submit to avoid spamming

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTickets();
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 w-full flex-1 flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Phiếu Bảo hành</h1>
          <p className="text-slate-500 text-sm mt-1">Duyệt và in phiếu bảo hành khớp phôi giấy A5</p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex bg-slate-200 p-1 rounded-lg">
          <button
            onClick={() => setFilter("cho_in")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition ${
              filter === "cho_in" ? "bg-white text-amber-600 shadow-sm" : "text-slate-600 hover:text-slate-800"
            }`}
          >
            <Clock className="h-4 w-4" />
            Chờ in
          </button>
          <button
            onClick={() => setFilter("da_in")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition ${
              filter === "da_in" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-600 hover:text-slate-800"
            }`}
          >
            <CheckCircle className="h-4 w-4" />
            Đã in
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <form onSubmit={handleSearch} className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm số phiếu, tên khách, serial..."
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-md bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button type="submit" className="hidden">Search</button>
          </form>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Số phiếu</th>
                <th className="px-6 py-3">Ngày bán</th>
                <th className="px-6 py-3">Khách hàng</th>
                <th className="px-6 py-3">Model</th>
                <th className="px-6 py-3">Serial</th>
                <th className="px-6 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Không có dữ liệu phiếu.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-semibold text-slate-900">#{t.so_phieu}</td>
                    <td className="px-6 py-4">{formatDate(t.ngay_mua)}</td>
                    <td className="px-6 py-4 truncate max-w-[200px]" title={t.ten_khach_hang}>
                      {t.ten_khach_hang}
                    </td>
                    <td className="px-6 py-4 font-medium">{t.model_name}</td>
                    <td className="px-6 py-4">{t.serial || "-"}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditId(t.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded text-sm font-medium hover:bg-slate-200 transition"
                        >
                          <Pencil className="h-4 w-4" />
                          Sửa
                        </button>
                        <Link
                          href={`/admin/print/${t.id}`}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition ${
                            t.trang_thai === "cho_in"
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          <Printer className="h-4 w-4" />
                          {t.trang_thai === "cho_in" ? "In phôi" : "In lại"}
                        </Link>
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
