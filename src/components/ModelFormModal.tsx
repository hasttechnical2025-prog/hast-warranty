"use client";

import React, { useState } from "react";
import { X, Save, Cpu } from "lucide-react";

export interface Model {
  id: number;
  model_name: string;
  loai_san_pham: string;
  hang_sx: string;
  cau_hinh: string;
  so_ban_chup_mac_dinh: number;
  so_thang_mac_dinh: number;
  is_draft?: boolean;
}

interface Props {
  model: Model | null; // null = thêm mới
  onClose: () => void;
  onSaved: () => void;
}

export function ModelFormModal({ model, onClose, onSaved }: Props) {
  const [modelName, setModelName] = useState(model?.model_name ?? "");
  const [hangSx, setHangSx] = useState(model?.hang_sx ?? "");
  const [loaiSanPham, setLoaiSanPham] = useState(model?.loai_san_pham ?? "Máy photocopy");
  const [cauHinh, setCauHinh] = useState(model?.cau_hinh ?? "Copy-In-Quét");
  const [soBanChup, setSoBanChup] = useState(String(model?.so_ban_chup_mac_dinh ?? 100000));
  const [soThang, setSoThang] = useState(String(model?.so_thang_mac_dinh ?? 12));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    setErr("");
    if (!modelName.trim() || !hangSx.trim()) {
      setErr("Vui lòng nhập Tên Model và Hãng SX.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: model?.id,
          model_name: modelName,
          hang_sx: hangSx,
          loai_san_pham: loaiSanPham,
          cau_hinh: cauHinh,
          so_ban_chup_mac_dinh: Number(soBanChup),
          so_thang_mac_dinh: Number(soThang),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lưu thất bại");
      onSaved();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";
  const labelCls = "mb-1 block text-sm font-medium text-slate-700";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 bg-emerald-600 px-5 py-3 text-white">
          <h2 className="flex items-center gap-2 font-bold">
            <Cpu className="h-5 w-5" /> {model ? "Sửa model máy" : "Thêm model máy mới"}
          </h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-white/15">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {model?.is_draft && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
              Model này do nhân viên tạo khi đăng ký, <b>chưa chuẩn hoá</b>. Kiểm tra thông tin rồi bấm Lưu để xác nhận chuẩn.
            </div>
          )}
          {err && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{err}</div>}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>
                Tên Model <span className="text-red-500">*</span>
              </label>
              <input value={modelName} onChange={(e) => setModelName(e.target.value)} className={inputCls} placeholder="Apeos 3561" />
            </div>
            <div>
              <label className={labelCls}>
                Hãng sản xuất <span className="text-red-500">*</span>
              </label>
              <input value={hangSx} onChange={(e) => setHangSx(e.target.value)} className={inputCls} placeholder="Fujifilm" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Loại sản phẩm</label>
              <input value={loaiSanPham} onChange={(e) => setLoaiSanPham(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Cấu hình sản phẩm</label>
              <input value={cauHinh} onChange={(e) => setCauHinh(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Bảo hành (bản chụp)</label>
              <input
                type="number"
                value={soBanChup}
                onChange={(e) => setSoBanChup(e.target.value)}
                className={inputCls}
                placeholder="Để trống/0 nếu không có"
              />
            </div>
            <div>
              <label className={labelCls}>Thời gian (tháng)</label>
              <input type="number" value={soThang} onChange={(e) => setSoThang(e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">
            Hủy
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:bg-slate-300"
          >
            <Save className="h-4 w-4" /> {saving ? "Đang lưu..." : model ? "Lưu thay đổi" : "Thêm mới"}
          </button>
        </div>
      </div>
    </div>
  );
}
