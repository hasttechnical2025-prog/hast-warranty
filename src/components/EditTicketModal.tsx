"use client";

import React, { useEffect, useRef, useState } from "react";
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
  const [nguoiDangKy, setNguoiDangKy] = useState("");
  const [tenKhachHang, setTenKhachHang] = useState("");
  const [diaChi, setDiaChi] = useState("");
  const [selectedModel, setSelectedModel] = useState(""); // model_name | "" | "__new__"
  const [modelQuery, setModelQuery] = useState("");
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const modelBoxRef = useRef<HTMLDivElement>(null);
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
          setNguoiDangKy(t.nguoi_dang_ky || "");
          setTenKhachHang(t.ten_khach_hang || "");
          setDiaChi(t.dia_chi || "");
          setSelectedModel(t.model_name || "");
          setModelQuery(t.model_name || "");
          setLoaiSanPham(t.loai_san_pham || "");
          setHangSx(t.hang_sx || "");
          setCauHinh(t.cau_hinh || "");
          setSerial(t.serial || "");
          setDiaDiemBaoHanh(t.dia_diem_bao_hanh || "Tại khách hàng");
          setSoBanChup(t.so_ban_chup > 0 ? String(t.so_ban_chup) : "");
          setSoThang(t.so_thang > 0 ? String(t.so_thang) : "");
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

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (modelBoxRef.current && !modelBoxRef.current.contains(e.target as Node)) setShowModelDropdown(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const isNewModel = selectedModel === "__new__";
  const modelQ = modelQuery.trim().toLowerCase();
  const filteredModels = (
    modelQ
      ? models.filter((m) => m.model_name.toLowerCase().includes(modelQ) || (m.hang_sx || "").toLowerCase().includes(modelQ))
      : models
  ).slice(0, 8);
  const exactModelMatch = models.some((m) => m.model_name.toLowerCase() === modelQ);

  const onModelQueryChange = (val: string) => {
    setModelQuery(val);
    setShowModelDropdown(true);
    if (selectedModel && selectedModel !== "__new__" && val !== selectedModel) setSelectedModel("");
  };
  const pickModel = (m: Model) => {
    setSelectedModel(m.model_name);
    setModelQuery(m.model_name);
    setLoaiSanPham(m.loai_san_pham);
    setHangSx(m.hang_sx);
    setCauHinh(m.cau_hinh);
    // Chỉ gợi ý lại hạn mức nếu đang trống (tránh ghi đè số đã nhập)
    setSoBanChup((prev) => (prev ? prev : m.so_ban_chup_mac_dinh > 0 ? String(m.so_ban_chup_mac_dinh) : ""));
    setSoThang((prev) => (prev ? prev : m.so_thang_mac_dinh > 0 ? String(m.so_thang_mac_dinh) : ""));
    setShowModelDropdown(false);
  };
  const pickNewModel = () => {
    setSelectedModel("__new__");
    setShowModelDropdown(false);
  };

  const handleSave = async () => {
    if (!nguoiDangKy.trim()) return setErrorMsg("Vui lòng nhập tên người đăng ký.");
    if (!tenKhachHang.trim()) return setErrorMsg("Vui lòng điền tên khách hàng.");
    if (!diaChi.trim()) return setErrorMsg("Vui lòng điền địa chỉ.");
    if (!selectedModel) return setErrorMsg("Vui lòng chọn Model.");
    if (isNewModel && (!modelQuery.trim() || !hangSx.trim()))
      return setErrorMsg("Model mới: vui lòng nhập Tên model và Hãng SX.");
    if ((Number(soBanChup) || 0) <= 0 && (Number(soThang) || 0) <= 0)
      return setErrorMsg("Cần ít nhất một chế độ bảo hành: theo bản chụp hoặc theo tháng.");

    setSaving(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ngay_mua: ngayMua,
          nguoi_dang_ky: nguoiDangKy,
          ten_khach_hang: tenKhachHang,
          dia_chi: diaChi,
          model_name: isNewModel ? modelQuery.trim() : selectedModel,
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
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500";
  const roCls = "w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-brand-600 px-5 py-3 text-white">
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

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Người đăng ký <span className="text-red-500">*</span>
                </label>
                <input
                  value={nguoiDangKy}
                  onChange={(e) => setNguoiDangKy(e.target.value)}
                  className={inputCls}
                  placeholder="Tên nhân viên lập phiếu..."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Ngày bán</label>
                  <DateField value={ngayMua} onChange={setNgayMua} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Model <span className="text-red-500">*</span>
                  </label>
                  <div className="relative" ref={modelBoxRef}>
                    <input
                      value={modelQuery}
                      onChange={(e) => onModelQueryChange(e.target.value)}
                      onFocus={() => setShowModelDropdown(true)}
                      placeholder="Gõ tên model để tìm..."
                      className={inputCls}
                      autoComplete="off"
                    />
                    {showModelDropdown && (
                      <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                        {filteredModels.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => pickModel(m)}
                            className="flex w-full items-center justify-between gap-2 border-b border-slate-50 px-3 py-2 text-left text-sm hover:bg-brand-50"
                          >
                            <span className="font-semibold text-slate-800">{m.model_name}</span>
                            <span className="shrink-0 text-xs text-slate-400">{m.hang_sx}</span>
                          </button>
                        ))}
                        {modelQuery.trim() && !exactModelMatch && (
                          <button
                            type="button"
                            onClick={pickNewModel}
                            className="block w-full px-3 py-2 text-left text-sm text-amber-700 hover:bg-amber-50"
                          >
                            + Thêm model mới: <b>“{modelQuery.trim()}”</b>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Tên khách hàng <span className="text-red-500">*</span>
                </label>
                <input
                  value={tenKhachHang}
                  onChange={(e) => setTenKhachHang(e.target.value.toUpperCase())}
                  className={inputCls}
                />
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
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    Hãng sản xuất {isNewModel && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    value={hangSx}
                    onChange={(e) => setHangSx(e.target.value)}
                    disabled={!isNewModel}
                    placeholder={isNewModel ? "VD: Asmix" : undefined}
                    className={isNewModel ? inputCls : roCls}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Loại sản phẩm</label>
                  <input
                    value={loaiSanPham}
                    onChange={(e) => setLoaiSanPham(e.target.value)}
                    disabled={!isNewModel}
                    className={isNewModel ? inputCls : roCls}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Cấu hình</label>
                  <input
                    value={cauHinh}
                    onChange={(e) => setCauHinh(e.target.value)}
                    disabled={!isNewModel}
                    className={isNewModel ? inputCls : roCls}
                  />
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
                            ? "border-brand-500 bg-brand-50 text-brand-700"
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
                  <label className="mb-1 block text-sm font-medium text-slate-700">Hạn mức bản chụp</label>
                  <input
                    type="number"
                    value={soBanChup}
                    onChange={(e) => setSoBanChup(e.target.value)}
                    className={inputCls}
                    placeholder="Để trống nếu không có"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Thời hạn (tháng)</label>
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
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 disabled:bg-slate-300"
          >
            <Save className="h-4 w-4" />
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
}
