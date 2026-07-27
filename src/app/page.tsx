"use client";

import React, { useState, useEffect, useRef } from "react";
import { DateField } from "@/components/DateField";
import { ShieldCheck, User, MapPin, Cpu, Hash, FileText, Settings, Award } from "lucide-react";

interface Model {
  id: number;
  model_name: string;
  loai_san_pham: string;
  hang_sx: string;
  cau_hinh: string;
  so_ban_chup_mac_dinh: number;
  so_thang_mac_dinh: number;
}

interface Customer {
  id: number;
  ten_khach_hang: string;
  dia_chi: string;
}

export default function RegisterWarrantyPage() {
  // Form State
  const [ngayMua, setNgayMua] = useState<string>("");
  const [tenKhachHang, setTenKhachHang] = useState<string>("");
  const [khachHangId, setKhachHangId] = useState<number | null>(null);
  const [diaChi, setDiaChi] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [loaiSanPham, setLoaiSanPham] = useState<string>("");
  const [hangSx, setHangSx] = useState<string>("");
  const [serial, setSerial] = useState<string>("");
  const [cauHinh, setCauHinh] = useState<string>("");
  const [diaDiemBaoHanh, setDiaDiemBaoHanh] = useState<string>("Tại khách hàng");
  const [soBanChup, setSoBanChup] = useState<string>("");
  const [soThang, setSoThang] = useState<string>("");

  // UI State
  const [models, setModels] = useState<Model[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showCustSuggestions, setShowCustSuggestions] = useState<boolean>(false);
  const [loadingModels, setLoadingModels] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successTicket, setSuccessTicket] = useState<{ id: number; so_phieu: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const suggestionRef = useRef<HTMLDivElement>(null);

  // Set default today's date on load
  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    setNgayMua(`${yyyy}-${mm}-${dd}`);
  }, []);

  // Fetch default models
  useEffect(() => {
    fetch("/api/models")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setModels(data);
        }
        setLoadingModels(false);
      })
      .catch((err) => {
        console.error("Failed to load models", err);
        setLoadingModels(false);
      });
  }, []);

  // Fuzzy lookup customers with debounce
  useEffect(() => {
    if (tenKhachHang.trim().length < 2) {
      setCustomers([]);
      return;
    }

    const timer = setTimeout(() => {
      fetch(`/api/customers?q=${encodeURIComponent(tenKhachHang)}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setCustomers(data);
          }
        })
        .catch((err) => console.error("Error loading customers", err));
    }, 300);

    return () => clearTimeout(timer);
  }, [tenKhachHang]);

  // Click outside listener for suggestions list
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowCustSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle Model selection and auto-populate
  const handleModelChange = (modelName: string) => {
    setSelectedModel(modelName);
    const model = models.find((m) => m.model_name === modelName);
    if (model) {
      setLoaiSanPham(model.loai_san_pham);
      setHangSx(model.hang_sx);
      setCauHinh(model.cau_hinh);
      setSoBanChup(String(model.so_ban_chup_mac_dinh));
      setSoThang(String(model.so_thang_mac_dinh));
    } else {
      setLoaiSanPham("");
      setHangSx("");
      setCauHinh("");
      setSoBanChup("");
      setSoThang("");
    }
  };

  // Handle serial input: uppercase + keep only alphanumeric chars
  const handleSerialChange = (val: string) => {
    const cleaned = val.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    setSerial(cleaned);
  };

  // Handle customer suggestion click
  const selectCustomer = (cust: Customer) => {
    setTenKhachHang(cust.ten_khach_hang);
    setDiaChi(cust.dia_chi);
    setKhachHangId(cust.id);
    setShowCustSuggestions(false);
  };

  // Check if manually changing customer name -> disconnect from previous ID
  const handleNameChange = (val: string) => {
    setTenKhachHang(val);
    setKhachHangId(null); // clear relation if name changes
    setShowCustSuggestions(true);
  };

  const resetForm = () => {
    setTenKhachHang("");
    setKhachHangId(null);
    setDiaChi("");
    setSelectedModel("");
    setLoaiSanPham("");
    setHangSx("");
    setSerial("");
    setCauHinh("");
    setDiaDiemBaoHanh("Tại khách hàng");
    setSoBanChup("");
    setSoThang("");
    setSuccessTicket(null);
    setErrorMsg("");

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    setNgayMua(`${yyyy}-${mm}-${dd}`);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tenKhachHang.trim()) {
      setErrorMsg("Vui lòng điền tên khách hàng.");
      return;
    }
    if (!diaChi.trim()) {
      setErrorMsg("Vui lòng điền địa chỉ.");
      return;
    }
    if (!selectedModel) {
      setErrorMsg("Vui lòng chọn Model máy.");
      return;
    }
    if (!soBanChup || !soThang) {
      setErrorMsg("Vui lòng điền đầy đủ chế độ bảo hành.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ngay_mua: ngayMua,
          ten_khach_hang: tenKhachHang,
          dia_chi: diaChi,
          model_name: selectedModel,
          loai_san_pham: loaiSanPham,
          hang_sx: hangSx,
          serial: serial,
          cau_hinh: cauHinh,
          dia_diem_bao_hanh: diaDiemBaoHanh,
          so_ban_chup: soBanChup,
          so_thang: soThang,
          khach_hang_id: khachHangId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gặp lỗi khi tạo phiếu bảo hành.");
      }

      setSuccessTicket({
        id: data.id,
        so_phieu: data.so_phieu,
      });
    } catch (err: any) {
      setErrorMsg(err.message || "Không thể kết nối đến máy chủ.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 w-full flex-1 flex flex-col justify-center">
      {successTicket ? (
        <div className="bg-white p-8 rounded-xl shadow-md border border-emerald-100 text-center flex flex-col items-center gap-6">
          <div className="bg-emerald-100 p-4 rounded-full text-emerald-600">
            <ShieldCheck className="h-16 w-16" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Đăng ký thành công!</h2>
            <p className="text-slate-500 mt-2">
              Phiếu bảo hành số <strong className="text-emerald-600 text-lg">#{successTicket.so_phieu}</strong> đã được lưu lên hệ thống và gửi thông báo in.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
            <button
              onClick={resetForm}
              className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition shadow-sm"
            >
              Đăng ký phiếu mới
            </button>
            <a
              href="/admin"
              className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition text-center"
            >
              Vào danh sách duyệt in
            </a>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
          <div className="bg-emerald-600 px-6 py-4 text-white flex items-center gap-3">
            <Award className="h-6 w-6" />
            <div>
              <h1 className="font-bold text-lg">ĐĂNG KÝ PHIẾU BẢO HÀNH MỚI</h1>
              <p className="text-xs text-emerald-100">Dành cho nhân viên kinh doanh / dịch vụ</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {errorMsg && (
              <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded text-sm">
                {errorMsg}
              </div>
            )}

            {/* Ngày */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 py-3 border-b border-slate-100">
              <label className="text-sm font-semibold text-slate-700 sm:w-52 shrink-0">
                Ngày
              </label>
              <div className="w-full flex-1">
                <div className="w-48">
                  <DateField
                    value={ngayMua}
                    onChange={setNgayMua}
                  />
                </div>
              </div>
            </div>

            {/* Tên khách hàng (với suggestions) */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 py-3 border-b border-slate-100">
              <label className="text-sm font-semibold text-slate-700 sm:w-52 shrink-0 flex items-center gap-1">
                <User className="h-4 w-4 text-slate-400" />
                Tên khách hàng <span className="text-red-500">*</span>
              </label>
              <div className="w-full flex-1 relative" ref={suggestionRef}>
                <input
                  type="text"
                  value={tenKhachHang}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onFocus={() => setShowCustSuggestions(true)}
                  placeholder="Nhập hoặc dán tên khách hàng..."
                  className="w-full max-w-xl px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />

                {/* Suggestions Dropdown */}
                {showCustSuggestions && customers.length > 0 && (
                  <div className="absolute top-[100%] left-0 w-full max-w-xl bg-white border border-slate-200 rounded-md shadow-lg z-20 mt-1 max-h-60 overflow-y-auto">
                    <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500">
                      Gợi ý khách hàng cũ (Fuzzy Match):
                    </div>
                    {customers.map((cust) => (
                      <button
                        key={cust.id}
                        type="button"
                        onClick={() => selectCustomer(cust)}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex flex-col gap-0.5 border-b border-slate-50"
                      >
                        <span className="font-semibold text-slate-800">{cust.ten_khach_hang}</span>
                        <span className="text-xs text-slate-500 line-clamp-1">{cust.dia_chi}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Địa chỉ */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-4 py-3 border-b border-slate-100">
              <label className="text-sm font-semibold text-slate-700 sm:w-52 shrink-0 flex items-center gap-1 pt-1.5">
                <MapPin className="h-4 w-4 text-slate-400" />
                Địa chỉ khách hàng <span className="text-red-500">*</span>
              </label>
              <div className="w-full flex-1">
                <textarea
                  value={diaChi}
                  onChange={(e) => setDiaChi(e.target.value)}
                  placeholder="Nhập hoặc dán địa chỉ khách hàng..."
                  className="w-full max-w-2xl px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 h-20 resize-none"
                  required
                />
              </div>
            </div>

            <hr className="border-slate-200" />

            {/* Thông tin máy */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-4">
              <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-1.5">
                <Cpu className="h-4.5 w-4.5 text-emerald-600" />
                Thông tin sản phẩm bán
              </h3>

              <div className="space-y-4">
                {/* Model */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 py-3 border-b border-slate-200/50">
                  <label className="text-sm font-semibold text-slate-700 sm:w-52 shrink-0">
                    Model sản phẩm <span className="text-red-500">*</span>
                  </label>
                  <div className="w-full flex-1">
                    <select
                      value={selectedModel}
                      onChange={(e) => handleModelChange(e.target.value)}
                      className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    >
                      <option value="">-- Chọn Model --</option>
                      {models.map((m) => (
                        <option key={m.id} value={m.model_name}>
                          {m.model_name} ({m.hang_sx})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Serial */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 py-3">
                  <label className="text-sm font-semibold text-slate-700 sm:w-52 shrink-0 flex items-center gap-1">
                    <Hash className="h-4 w-4 text-slate-400" />
                    Số serial
                  </label>
                  <div className="w-full flex-1">
                    <input
                      type="text"
                      value={serial}
                      onChange={(e) => handleSerialChange(e.target.value)}
                      placeholder="Ví dụ: 600186"
                      className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Locked/Auto-filled Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-slate-500">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium">Hãng sản xuất</span>
                  <input
                    type="text"
                    value={hangSx}
                    disabled
                    placeholder="Chạy theo model"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-slate-100 text-slate-500 text-sm cursor-not-allowed"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium">Loại sản phẩm</span>
                  <input
                    type="text"
                    value={loaiSanPham}
                    disabled
                    placeholder="Chạy theo model"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-slate-100 text-slate-500 text-sm cursor-not-allowed"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium">Cấu hình sản phẩm</span>
                  <input
                    type="text"
                    value={cauHinh}
                    disabled
                    placeholder="Chạy theo model"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-slate-100 text-slate-500 text-sm cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-200" />

            {/* Điều khoản bảo hành */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-1.5">
                <FileText className="h-4.5 w-4.5 text-emerald-600" />
                Điều khoản & Địa điểm bảo hành
              </h3>

              <div className="flex flex-col sm:flex-row items-start gap-4">
                {/* Số bản chụp */}
                <div className="w-full sm:w-48 flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    Thời hạn bảo hành (bản chụp)
                  </label>
                  <input
                    type="number"
                    value={soBanChup}
                    onChange={(e) => setSoBanChup(e.target.value)}
                    placeholder="Ví dụ: 100000"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                  {selectedModel && (
                    <span className="text-[11px] text-slate-400">
                      Mặc định Model: {Number(models.find(m => m.model_name === selectedModel)?.so_ban_chup_mac_dinh || 0).toLocaleString('vi-VN')}
                    </span>
                  )}
                </div>

                {/* Số tháng */}
                <div className="w-full sm:w-36 flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    Thời hạn bảo hành (tháng)
                  </label>
                  <input
                    type="number"
                    value={soThang}
                    onChange={(e) => setSoThang(e.target.value)}
                    placeholder="Ví dụ: 12"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                  {selectedModel && (
                    <span className="text-[11px] text-slate-400">
                      Mặc định Model: {models.find(m => m.model_name === selectedModel)?.so_thang_mac_dinh || 0} tháng
                    </span>
                  )}
                </div>

                {/* Địa điểm bảo hành (Khung mờ) */}
                <div className="w-full sm:flex-1 bg-slate-50 border border-slate-200/60 p-3 rounded-lg flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-slate-750">Địa điểm bảo hành</span>
                  <div className="flex gap-5 text-sm whitespace-nowrap py-1">
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                      <input
                        type="radio"
                        name="diaDiem"
                        value="Tại khách hàng"
                        checked={diaDiemBaoHanh === "Tại khách hàng"}
                        onChange={(e) => setDiaDiemBaoHanh(e.target.value)}
                        className="text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                      />
                      Tại khách hàng
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                      <input
                        type="radio"
                        name="diaDiem"
                        value="Tại trung tâm"
                        checked={diaDiemBaoHanh === "Tại trung tâm"}
                        onChange={(e) => setDiaDiemBaoHanh(e.target.value)}
                        className="text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                      />
                      Tại Trung tâm
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting || !tenKhachHang.trim() || !diaChi.trim() || !selectedModel || !soBanChup.trim() || !soThang.trim()}
                className="w-full py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 active:bg-emerald-800 transition disabled:bg-slate-200 disabled:text-slate-400 shadow-sm"
              >
                {submitting ? "Đang gửi yêu cầu..." : "GỬI YÊU CẦU CẤP PHIẾU"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
