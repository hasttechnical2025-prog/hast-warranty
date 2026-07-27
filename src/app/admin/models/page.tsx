"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Check, X, ShieldCheck, Cpu, FileSpreadsheet } from "lucide-react";
import { ImportModelsModal } from "@/components/ImportModelsModal";

interface Model {
  id: number;
  model_name: string;
  loai_san_pham: string;
  hang_sx: string;
  cau_hinh: string;
  so_ban_chup_mac_dinh: number;
  so_thang_mac_dinh: number;
}

export default function ManageModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form states
  const [editingId, setEditingId] = useState<number | null>(null);
  const [modelName, setModelName] = useState("");
  const [loaiSanPham, setLoaiSanPham] = useState("Máy photocopy");
  const [hangSx, setHangSx] = useState("");
  const [cauHinh, setCauHinh] = useState("Copy-In-Quét");
  const [soBanChup, setSoBanChup] = useState("100000");
  const [soThang, setSoThang] = useState("12");
  const [saving, setSaving] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const fetchModels = () => {
    setLoading(true);
    fetch("/api/models")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setModels(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load models", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleEdit = (model: Model) => {
    setEditingId(model.id);
    setModelName(model.model_name);
    setLoaiSanPham(model.loai_san_pham);
    setHangSx(model.hang_sx);
    setCauHinh(model.cau_hinh);
    setSoBanChup(String(model.so_ban_chup_mac_dinh));
    setSoThang(String(model.so_thang_mac_dinh));
  };

  const handleCancel = () => {
    setEditingId(null);
    clearForm();
  };

  const clearForm = () => {
    setModelName("");
    setLoaiSanPham("Máy photocopy");
    setHangSx("");
    setCauHinh("Copy-In-Quét");
    setSoBanChup("100000");
    setSoThang("12");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelName.trim() || !hangSx.trim()) {
      setErrorMsg("Vui lòng nhập đầy đủ thông tin tên Model và Hãng SX.");
      return;
    }

    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const response = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          model_name: modelName,
          loai_san_pham: loaiSanPham,
          hang_sx: hangSx,
          cau_hinh: cauHinh,
          so_ban_chup_mac_dinh: Number(soBanChup),
          so_thang_mac_dinh: Number(soThang),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gặp lỗi khi lưu model.");
      }

      setSuccessMsg(editingId ? "Cập nhật model thành công!" : "Thêm mới model thành công!");
      setEditingId(null);
      clearForm();
      fetchModels();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa Model "${name}" không?`)) {
      return;
    }

    setErrorMsg("");
    setSuccessMsg("");

    try {
      const response = await fetch(`/api/models?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Gặp lỗi khi xóa model.");
      }

      setSuccessMsg("Xóa model thành công!");
      fetchModels();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 w-full flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left side: Add/Edit Form */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-emerald-600 px-6 py-4 text-white flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            <h2 className="font-bold text-base">
              {editingId ? "CẬP NHẬT MODEL MÁY" : "THÊM MODEL MÁY MỚI"}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {errorMsg && (
              <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded text-xs">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="p-3 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 rounded text-xs flex items-center gap-1">
                <ShieldCheck className="h-4 w-4" />
                {successMsg}
              </div>
            )}

            {/* Model Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Tên Model *</label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="Ví dụ: Apeos 3561"
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            {/* Hãng SX */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Hãng sản xuất *</label>
              <input
                type="text"
                value={hangSx}
                onChange={(e) => setHangSx(e.target.value)}
                placeholder="Ví dụ: Fujifilm"
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            {/* Loại sản phẩm */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Loại sản phẩm</label>
              <input
                type="text"
                value={loaiSanPham}
                onChange={(e) => setLoaiSanPham(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            {/* Cấu hình */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Cấu hình sản phẩm</label>
              <input
                type="text"
                value={cauHinh}
                onChange={(e) => setCauHinh(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Số bản chụp */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Bảo hành (bản chụp)</label>
                <input
                  type="number"
                  value={soBanChup}
                  onChange={(e) => setSoBanChup(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Số tháng */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Thời gian (tháng)</label>
                <input
                  type="number"
                  value={soThang}
                  onChange={(e) => setSoThang(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition text-sm shadow-sm"
              >
                {saving ? "Đang lưu..." : editingId ? "CẬP NHẬT" : "THÊM MỚI"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition text-sm"
                >
                  HỦY
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Right side: List Table */}
      <div className="lg:col-span-2 flex flex-col">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
            <span className="font-bold text-slate-700">Danh sách Model máy hiện có ({models.length})</span>
            <button
              onClick={() => setShowImport(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Nhập từ Excel
            </button>
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
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      Đang tải danh sách model...
                    </td>
                  </tr>
                ) : models.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      Chưa có model máy nào được tạo.
                    </td>
                  </tr>
                ) : (
                  models.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 font-bold text-slate-900">{m.model_name}</td>
                      <td className="px-6 py-4">{m.hang_sx}</td>
                      <td className="px-6 py-4">{m.so_ban_chup_mac_dinh.toLocaleString("vi-VN")}</td>
                      <td className="px-6 py-4">{m.so_thang_mac_dinh} tháng</td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(m)}
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
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showImport && (
        <ImportModelsModal
          onClose={() => setShowImport(false)}
          onImported={fetchModels}
        />
      )}
    </div>
  );
}
