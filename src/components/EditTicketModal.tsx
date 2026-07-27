"use client";

import React, { useEffect, useState } from "react";
import { DateField } from "@/components/DateField";
import { X, Save } from "lucide-react";

interface Model {
  id: number;
  model_name: string;
  loai_san_pham: string;
  hang_sx: string;
  cau_hinh: string;
  so_ban_chup_mac_dinh: number;
  so_thang_mac_dinh: number;
}

interface EditTicketModalProps {
  ticketId: number;
  onClose: () => void;
  onSaved: () => void;
}

export function EditTicketModal({ ticketId, onClose, onSaved }: EditTicketModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [models, setModels] = useState<Model[]>([]);

  const [soPhieu, setSoPhieu] = useState<number | null>(null);
  const [ngayMua, setNgayMua] = useState("");
  const [tenKhachHang, setTenKhachHang] = useState("");
  const [diaChi, setDiaChi] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [loaiSanPham, setLoaiSanPham] = useState("");
  const [hangSx, setHangSx] = useState("");
  const [cauHinh, setCauHinh] = useState("");
  const [serial, setSerial] = useState("");
  const [diaDiemBaoHanh, setDiaDiemBaoHanh] = useState("Tại khách hàng");
  const [soBanChup, setSoBanChup] = useState("");
  const [soThang, setSoThang] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch("/api/models").then((r) => r.json()),
      fetch(`/api/tickets/${ticketId}`).then((r) => r.json()),
    ])
      .then(([modelsData, t]) => {
        if (!alive) return;
        if (Array.isArray(modelsData)) setModels(modelsData);
        if (t && !t.error) {
          setSoPhieu(t.so_phieu);
          setNgayMua((t.ngay_mua || "").slice(0, 10));
          setTenKhachHang(t.ten_khach_hang || "");
          setDiaChi(t.dia_chi || "");
          setSelectedModel(t.model_name || "");
          setLoaiSanPham(t.loai_san_pham || "");
          setHangSx(t.hang_sx || "");
          setCauHinh(t.cau_hinh || "");
          setSerial(t.serial || "");
          setDiaDiemBaoHanh(t.dia_diem_bao_hanh || "Tại khách hàng");
          setSoBanChup(String(t.so_ban_chup ?? ""));
          setSoThang(String(t.so_thang ?? ""));
        } else {
          setErrorMsg("Không tải được dữ liệu phiếu.");
        }
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setErrorMsg("Lỗi kết nối khi tải phiếu.");
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [ticketId]);

  const handleModelChange = (name: string) => {
    setSelectedModel(name);
    const m = models.find((x) => x.model_name === name);
    if (m) {
      setLoaiSanPham(m.loai_san_pham);
      setHangSx(m.hang_sx);
      setCauHinh(m.cau_hinh);
      // Chỉ gợi ý lại hạn mức nếu đang trống (tránh ghi đè số đã nhập)
      setSoBanChup((prev) => (prev ? prev : String(m.so_ban_chup_mac_dinh)));
      setSoThang((prev) => (prev ? prev : String(m.so_thang_mac_dinh)));
    }
  };

  const handleSave = async () => {
    if (!tenKhachHang.trim()) return setErrorMsg("Vui lòng điền tên khách hàng.");
    if (!diaChi.trim()) return setErrorMsg("Vui lòng điền địa chỉ.");
    if (!selectedModel) return setErrorMsg("Vui lòng chọn Model.");
    if (!soBanChup || !soThang) return setErrorMsg("Vui lòng điền đầy đủ chế độ bảo hành.");

    setSaving(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ngay_mua: ngayMua,
          ten_khach_hang: tenKhachHang,
          dia_chi: diaChi,
          model_name: selectedModel,
          loai_san_pham: loaiSanPham,
          hang_sx: hangSx,
          cau_hinh: cauHinh,
          serial,
          dia_diem_bao_hanh: diaDiemBaoHanh,
          so_ban_chup: soBanChup,
          so_thang: soThang,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lưu thất bại.");
      onSaved();
    } catch (e: any) {
      setErrorMsg(e.message || "Không kết nối được máy chủ.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500";
  const roCls = "w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-emerald-600 px-5 py-3 text-white">
          <h2 className="font-bold">
            Sửa phiếu bảo hành {soPhieu ? `#${soPhieu}` : ""}
          </h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-white/15" title="Đóng">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <p className="py-10 text-center text-slate-500">Đang tải dữ liệu phiếu...</p>
          ) : (
            <div className="space-y-4">
              {errorMsg && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                  {errorMsg}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Ngày bán</label>
                  <DateField value={ngayMua} onChange={setNgayMua} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Model <span className="text-red-500">*</span>
                  </label>
                  <select value={selectedModel} onChange={(e) => handleModelChange(e.target.value)} className={inputCls}>
                    <option value="">-- Chọn Model --</option>
                    {models.map((m) => (
                      <option key={m.id} value={m.model_name}>
                        {m.model_name} ({m.hang_sx})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Tên khách hàng <span className="text-red-500">*</span>
                </label>
                <input value={tenKhachHang} onChange={(e) => setTenKhachHang(e.target.value)} className={inputCls} />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Địa chỉ <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={diaChi}
                  onChange={(e) => setDiaChi(e.target.value)}
                  className={`${inputCls} h-16 resize-none`}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Hãng sản xuất</label>
                  <input value={hangSx} disabled className={roCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Loại sản phẩm</label>
                  <input value={loaiSanPham} disabled className={roCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Cấu hình</label>
                  <input value={cauHinh} disabled className={roCls} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Số serial</label>
                  <input
                    value={serial}
                    onChange={(e) => setSerial(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())}
                    className={`${inputCls} font-mono`}
                    placeholder="Ví dụ: 600186"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Địa điểm bảo hành</label>
                  <div className="flex gap-2">
                    {["Tại khách hàng", "Tại trung tâm"].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setDiaDiemBaoHanh(v)}
                        className={`flex-1 rounded-lg border px-2 py-2 text-sm font-medium transition ${
                          diaDiemBaoHanh === v
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Hạn mức bản chụp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={soBanChup}
                    onChange={(e) => setSoBanChup(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Thời hạn (tháng) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={soThang}
                    onChange={(e) => setSoThang(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={loading || saving}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:bg-slate-300"
          >
            <Save className="h-4 w-4" />
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
}
