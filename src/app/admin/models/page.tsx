"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Edit2, FileSpreadsheet, Search, AlertTriangle } from "lucide-react";
import { ImportModelsModal } from "@/components/ImportModelsModal";
import { ModelFormModal, type Model } from "@/components/ModelFormModal";
import { AdminSettingsTabs } from "@/components/AdminSettingsTabs";

export default function ManageModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [search, setSearch] = useState("");
  const [onlyDraft, setOnlyDraft] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);

  const fetchModels = () => {
    setLoading(true);
    fetch("/api/models")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setModels(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const draftCount = useMemo(() => models.filter((m) => m.is_draft).length, [models]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = models;
    if (onlyDraft) list = list.filter((m) => m.is_draft);
    if (q) list = list.filter((m) => m.model_name.toLowerCase().includes(q) || m.hang_sx.toLowerCase().includes(q));
    return list;
  }, [models, search, onlyDraft]);

  const openAdd = () => {
    setEditingModel(null);
    setShowForm(true);
  };
  const openEdit = (m: Model) => {
    setEditingModel(m);
    setShowForm(true);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa Model "${name}" không?`)) return;
    setErrorMsg("");
    try {
      const response = await fetch(`/api/models?id=${id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Gặp lỗi khi xóa model.");
      }
      fetchModels();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <AdminSettingsTabs />

      <div className="max-w-5xl mx-auto px-4 py-8 w-full flex-1 flex flex-col">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Cấu hình model máy</h1>
            <p className="text-sm text-slate-500">{models.length} model trong hệ thống</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImport(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Nhập từ Excel
            </button>
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              Thêm mới
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{errorMsg}</div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
          {/* Thanh tìm kiếm + lọc nháp */}
          <div className="p-3 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo tên model hoặc hãng..."
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-md bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            {draftCount > 0 && (
              <button
                onClick={() => setOnlyDraft((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition ${
                  onlyDraft
                    ? "bg-amber-500 text-white"
                    : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                }`}
                title="Model do nhân viên tạo, cần admin chuẩn hoá"
              >
                <AlertTriangle className="h-4 w-4" />
                {onlyDraft ? "Đang xem model nháp" : `Model nháp cần chuẩn hoá (${draftCount})`}
              </button>
            )}
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Model</th>
                  <th className="px-6 py-3">Hãng SX</th>
                  <th className="px-6 py-3">Bản chụp</th>
                  <th className="px-6 py-3">Thời gian</th>
                  <th className="px-6 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">Đang tải danh sách model...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      {search ? "Không tìm thấy model khớp." : "Chưa có model máy nào được tạo."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((m) => (
                    <tr key={m.id} className={`hover:bg-slate-50 transition ${m.is_draft ? "bg-amber-50/50" : ""}`}>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        <span className="inline-flex items-center gap-2">
                          {m.model_name}
                          {m.is_draft && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                              NHÁP
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4">{m.hang_sx}</td>
                      <td className="px-6 py-4">
                        {m.so_ban_chup_mac_dinh > 0 ? m.so_ban_chup_mac_dinh.toLocaleString("vi-VN") : "—"}
                      </td>
                      <td className="px-6 py-4">{m.so_thang_mac_dinh} tháng</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEdit(m)}
                            className="p-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded transition"
                            title="Sửa model"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(m.id, m.model_name)}
                            className="p-1.5 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded transition"
                            title="Xóa model"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showForm && (
        <ModelFormModal
          model={editingModel}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            fetchModels();
          }}
        />
      )}

      {showImport && <ImportModelsModal onClose={() => setShowImport(false)} onImported={fetchModels} />}
    </div>
  );
}
