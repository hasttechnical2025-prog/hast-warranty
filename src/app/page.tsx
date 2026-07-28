"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { DateField } from "@/components/DateField";
import { DEFAULT_SETTINGS, type AppSettings } from "@/lib/settings";
import {
  ShieldCheck,
  User,
  UserCheck,
  MapPin,
  Cpu,
  Hash,
  CircleCheck,
  QrCode,
  Cloud,
  Printer,
  Building2,
  House,
  Send,
  BadgeCheck,
  Info,
  Layers,
} from "lucide-react";

// Icon cho các dòng lợi ích ở panel trái (lặp lại nếu nhiều hơn số icon).
const BENEFIT_ICONS = [QrCode, Cloud, Printer];

// Lớp dùng chung cho input để đồng bộ giao diện toàn form.
const inputBase =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15";

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
  const [nguoiDangKy, setNguoiDangKy] = useState<string>("");
  const [tenKhachHang, setTenKhachHang] = useState<string>("");
  const [khachHangId, setKhachHangId] = useState<number | null>(null);
  const [diaChi, setDiaChi] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [newModelName, setNewModelName] = useState<string>("");
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
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const suggestionRef = useRef<HTMLDivElement>(null);

  // Set default today's date on load
  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    setNgayMua(`${yyyy}-${mm}-${dd}`);
  }, []);

  // Fetch cấu hình hệ thống (thương hiệu, panel)
  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) setSettings(data);
      })
      .catch(() => {});
  }, []);

  // Người đăng ký = tài khoản đang đăng nhập (không cho gõ tay)
  useEffect(() => {
    fetch("/api/admin/me")
      .then((res) => res.json())
      .then((d) => {
        if (d.authenticated && d.full_name) setNguoiDangKy(d.full_name);
      })
      .catch(() => {});
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
    // Chế độ "Model mới": cho nhân viên tự nhập, các ô hãng/loại/cấu hình để họ điền tay
    if (modelName === "__new__") {
      setNewModelName("");
      setLoaiSanPham("Máy photocopy");
      setHangSx("");
      setCauHinh("");
      setSoBanChup("");
      setSoThang("12");
      return;
    }
    const model = models.find((m) => m.model_name === modelName);
    if (model) {
      setLoaiSanPham(model.loai_san_pham);
      setHangSx(model.hang_sx);
      setCauHinh(model.cau_hinh);
      // 0 = không có chế độ đó -> để trống ô cho gọn
      setSoBanChup(model.so_ban_chup_mac_dinh > 0 ? String(model.so_ban_chup_mac_dinh) : "");
      setSoThang(model.so_thang_mac_dinh > 0 ? String(model.so_thang_mac_dinh) : "");
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
    setTenKhachHang((cust.ten_khach_hang || "").toUpperCase());
    setDiaChi(cust.dia_chi);
    setKhachHangId(cust.id);
    setShowCustSuggestions(false);
  };

  // Check if manually changing customer name -> disconnect from previous ID
  const handleNameChange = (val: string) => {
    setTenKhachHang(val.toUpperCase()); // tên khách mặc định IN HOA
    setKhachHangId(null); // clear relation if name changes
    setShowCustSuggestions(true);
  };

  const resetForm = () => {
    // giữ nguyên nguoiDangKy (theo tài khoản đăng nhập)
    setTenKhachHang("");
    setKhachHangId(null);
    setDiaChi("");
    setSelectedModel("");
    setNewModelName("");
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

    if (!nguoiDangKy.trim()) {
      setErrorMsg("Vui lòng nhập tên người đăng ký.");
      return;
    }
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
    if (selectedModel === "__new__" && (!newModelName.trim() || !hangSx.trim())) {
      setErrorMsg("Model mới: vui lòng nhập Tên model và Hãng SX.");
      return;
    }
    if ((Number(soBanChup) || 0) <= 0 && (Number(soThang) || 0) <= 0) {
      setErrorMsg("Cần ít nhất một chế độ bảo hành: theo bản chụp hoặc theo tháng.");
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
          nguoi_dang_ky: nguoiDangKy,
          ten_khach_hang: tenKhachHang,
          dia_chi: diaChi,
          model_name: selectedModel === "__new__" ? newModelName.trim() : selectedModel,
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

  const selectedModelData = models.find((m) => m.model_name === selectedModel);
  const soBanChupNum = Number(soBanChup);
  const isNewModel = selectedModel === "__new__";
  const modelSuggestions =
    isNewModel && newModelName.trim().length >= 2
      ? models
          .filter((m) => m.model_name.toLowerCase().includes(newModelName.trim().toLowerCase()))
          .slice(0, 6)
      : [];

  // ---- Màn hình thành công ----
  if (successTicket) {
    return (
      <div className="w-full flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-xl shadow-emerald-100/40">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 ring-8 ring-emerald-50">
            <CircleCheck className="h-11 w-11" />
          </div>
          <h2 className="mt-6 text-2xl font-bold text-slate-800">Đăng ký thành công!</h2>
          <p className="mt-2 text-sm text-slate-500">
            Yêu cầu cấp phiếu đã được lưu lên hệ thống và gửi thông báo in.
          </p>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Số phiếu bảo hành
            </div>
            <div className="mt-1 text-4xl font-extrabold text-emerald-600">
              #{successTicket.so_phieu}
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={resetForm}
              className="flex-1 rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:bg-emerald-800"
            >
              Đăng ký phiếu mới
            </button>
            <a
              href="/admin"
              className="flex-1 rounded-xl bg-slate-100 px-6 py-3 text-center font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              Vào danh sách duyệt in
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ---- Biểu mẫu đăng ký ----
  return (
    <div className="w-full flex-1 px-4 py-8 sm:py-10">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        {/* ===== Panel thương hiệu ===== */}
        <aside className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-700 p-8 text-white">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-white/5" />

          <div className="relative">
            <div className="inline-flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
              {settings.logo_data_url ? (
                <img src={settings.logo_data_url} alt="logo" className="h-full w-full object-contain" />
              ) : (
                <ShieldCheck className="h-7 w-7" />
              )}
            </div>
            <h1 className="mt-6 text-2xl font-bold leading-tight">{settings.reg_panel_title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-emerald-50/90">{settings.reg_panel_desc}</p>
          </div>

          <ul className="relative mt-8 space-y-4">
            {settings.reg_panel_benefits.map((text, i) => {
              const Icon = BENEFIT_ICONS[i % BENEFIT_ICONS.length];
              return (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm leading-snug text-emerald-50/95">{text}</span>
                </li>
              );
            })}
          </ul>

          <div className="relative mt-8 border-t border-white/15 pt-5 text-xs text-emerald-50/80">
            {settings.reg_panel_footer}
          </div>
        </aside>

        {/* ===== Biểu mẫu ===== */}
        <div className="p-6 sm:p-8">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-800">Đăng ký phiếu mới</h2>
            <Link
              href="/hang-loat"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
            >
              <Layers className="h-4 w-4" />
              Đăng ký hàng loạt
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {errorMsg && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* ---- Bước 1: Khách hàng ---- */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                  1
                </span>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-emerald-600" />
                  <h3 className="font-semibold text-slate-800">Thông tin khách hàng</h3>
                </div>
              </div>

              <div className="space-y-4 sm:pl-11">
                {/* Người đăng ký */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Người đăng ký <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <UserCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={nguoiDangKy}
                      readOnly
                      placeholder="Theo tài khoản đăng nhập"
                      className={`${inputBase} pl-10 bg-slate-50 text-slate-600 cursor-not-allowed`}
                      title="Tự động theo tài khoản đăng nhập"
                    />
                  </div>
                </div>

                {/* Ngày lập phiếu */}
                <div className="w-full sm:max-w-[220px]">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Ngày lập phiếu
                  </label>
                  <DateField value={ngayMua} onChange={setNgayMua} />
                </div>

                {/* Tên khách hàng */}
                <div className="relative" ref={suggestionRef}>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Tên khách hàng <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={tenKhachHang}
                      onChange={(e) => handleNameChange(e.target.value)}
                      onFocus={() => setShowCustSuggestions(true)}
                      placeholder="Nhập hoặc dán tên khách hàng..."
                      className={`${inputBase} pl-10`}
                      required
                    />
                  </div>

                  {/* Gợi ý khách hàng cũ */}
                  {showCustSuggestions && customers.length > 0 && (
                    <div className="absolute left-0 top-[100%] z-20 mt-1.5 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                      <div className="border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500">
                        Gợi ý khách hàng cũ
                      </div>
                      {customers.map((cust) => (
                        <button
                          key={cust.id}
                          type="button"
                          onClick={() => selectCustomer(cust)}
                          className="flex w-full flex-col gap-0.5 border-b border-slate-50 px-4 py-2 text-left text-sm transition hover:bg-emerald-50"
                        >
                          <span className="font-semibold text-slate-800">{cust.ten_khach_hang}</span>
                          <span className="line-clamp-1 text-xs text-slate-500">{cust.dia_chi}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Địa chỉ */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Địa chỉ khách hàng <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <textarea
                      value={diaChi}
                      onChange={(e) => setDiaChi(e.target.value)}
                      placeholder="Nhập hoặc dán địa chỉ khách hàng..."
                      className={`${inputBase} h-20 resize-none pl-10`}
                      required
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* ---- Bước 2: Sản phẩm ---- */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                  2
                </span>
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-emerald-600" />
                  <h3 className="font-semibold text-slate-800">Thông tin sản phẩm</h3>
                </div>
              </div>

              <div className="space-y-4 sm:pl-11">
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Model */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Model sản phẩm <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedModel}
                      onChange={(e) => handleModelChange(e.target.value)}
                      className={inputBase}
                      required
                    >
                      <option value="">
                        {loadingModels ? "Đang tải danh sách..." : "-- Chọn Model --"}
                      </option>
                      {models.map((m) => (
                        <option key={m.id} value={m.model_name}>
                          {m.model_name} ({m.hang_sx})
                        </option>
                      ))}
                      <option value="__new__">+ Nhập model mới (chưa có trong danh sách)</option>
                    </select>
                  </div>

                  {/* Serial */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Số serial
                    </label>
                    <div className="relative">
                      <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={serial}
                        onChange={(e) => handleSerialChange(e.target.value)}
                        placeholder="Ví dụ: 600186"
                        className={`${inputBase} pl-10 font-mono tracking-wide`}
                      />
                    </div>
                  </div>
                </div>

                {/* Model mới: nhập tên + gợi ý tránh trùng */}
                {isNewModel && (
                  <div className="relative">
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Tên model mới <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={newModelName}
                      onChange={(e) => setNewModelName(e.target.value)}
                      placeholder="VD: AR300C"
                      className={inputBase}
                    />
                    {modelSuggestions.length > 0 && (
                      <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                        <div className="border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500">
                          Có phải model này? (chọn để dùng lại, tránh tạo trùng)
                        </div>
                        {modelSuggestions.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleModelChange(m.model_name)}
                            className="block w-full px-4 py-2 text-left text-sm hover:bg-emerald-50"
                          >
                            <span className="font-semibold text-slate-800">{m.model_name}</span>{" "}
                            <span className="text-xs text-slate-500">({m.hang_sx})</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <p className="mt-1 text-[11px] text-amber-600">
                      Model mới sẽ được lưu dạng <b>nháp</b> để admin chuẩn hoá sau. Phiếu vẫn chờ admin duyệt.
                    </p>
                  </div>
                )}

                {/* Hãng / Loại / Cấu hình: tự điền theo model, hoặc nhập tay khi là model mới */}
                {isNewModel ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        Hãng SX <span className="text-red-500">*</span>
                      </label>
                      <input value={hangSx} onChange={(e) => setHangSx(e.target.value)} placeholder="VD: Asmix" className={inputBase} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        Loại sản phẩm
                      </label>
                      <input value={loaiSanPham} onChange={(e) => setLoaiSanPham(e.target.value)} className={inputBase} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        Cấu hình
                      </label>
                      <input value={cauHinh} onChange={(e) => setCauHinh(e.target.value)} className={inputBase} />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[
                      { label: "Hãng sản xuất", value: hangSx },
                      { label: "Loại sản phẩm", value: loaiSanPham },
                      { label: "Cấu hình", value: cauHinh },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className={`rounded-xl border px-3.5 py-2.5 transition ${
                          value ? "border-emerald-200 bg-emerald-50" : "border-dashed border-slate-200 bg-slate-50"
                        }`}
                      >
                        <div className={`text-[11px] font-medium uppercase tracking-wide ${value ? "text-emerald-600" : "text-slate-400"}`}>
                          {label}
                        </div>
                        <div className={`mt-0.5 truncate text-sm font-semibold ${value ? "text-slate-800" : "text-slate-400"}`}>
                          {value || "Tự điền theo model"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* ---- Bước 3: Chế độ bảo hành ---- */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                  3
                </span>
                <div className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-emerald-600" />
                  <h3 className="font-semibold text-slate-800">Chế độ &amp; địa điểm bảo hành</h3>
                </div>
              </div>

              <div className="space-y-4 sm:pl-11">
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Số bản chụp */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Hạn mức bản chụp
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={soBanChup}
                        onChange={(e) => setSoBanChup(e.target.value)}
                        placeholder="Để trống nếu không có"
                        className={`${inputBase} pr-12`}
                      />
                      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                        bản
                      </span>
                    </div>
                    <span className="mt-1 block text-[11px] text-slate-400">
                      {soBanChupNum > 0
                        ? `≈ ${soBanChupNum.toLocaleString("vi-VN")} bản chụp`
                        : selectedModelData
                        ? `Mặc định model: ${Number(selectedModelData.so_ban_chup_mac_dinh).toLocaleString("vi-VN")}`
                        : " "}
                    </span>
                  </div>

                  {/* Số tháng */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Thời hạn <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={soThang}
                        onChange={(e) => setSoThang(e.target.value)}
                        placeholder="Ví dụ: 12"
                        className={`${inputBase} pr-16`}
                        required
                      />
                      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                        tháng
                      </span>
                    </div>
                    <span className="mt-1 block text-[11px] text-slate-400">
                      {selectedModelData
                        ? `Mặc định model: ${selectedModelData.so_thang_mac_dinh} tháng`
                        : " "}
                    </span>
                  </div>
                </div>

                {/* Địa điểm bảo hành - nút phân đoạn */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Địa điểm bảo hành
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: "Tại khách hàng", icon: House, desc: "Kỹ thuật đến tận nơi" },
                      { value: "Tại trung tâm", icon: Building2, desc: "Khách mang máy đến" },
                    ].map(({ value, icon: Icon, desc }) => {
                      const active = diaDiemBaoHanh === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setDiaDiemBaoHanh(value)}
                          className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                            active
                              ? "border-emerald-500 bg-emerald-50 ring-4 ring-emerald-500/10"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                              active ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                          </span>
                          <span className="min-w-0">
                            <span
                              className={`block text-sm font-semibold ${
                                active ? "text-emerald-700" : "text-slate-700"
                              }`}
                            >
                              {value}
                            </span>
                            <span className="block truncate text-[11px] text-slate-400">{desc}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            {/* Nút gửi */}
            <div className="border-t border-slate-100 pt-6">
              <button
                type="submit"
                disabled={
                  submitting ||
                  !nguoiDangKy.trim() ||
                  !tenKhachHang.trim() ||
                  !diaChi.trim() ||
                  !selectedModel ||
                  (isNewModel && (!newModelName.trim() || !hangSx.trim())) ||
                  ((Number(soBanChup) || 0) <= 0 && (Number(soThang) || 0) <= 0)
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3.5 font-bold text-white shadow-sm shadow-emerald-500/20 transition hover:from-emerald-700 hover:to-teal-700 active:from-emerald-800 active:to-teal-800 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:shadow-none"
              >
                <Send className="h-5 w-5" />
                {submitting ? "Đang gửi yêu cầu..." : "Gửi yêu cầu cấp phiếu"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
