"use client";

import React, { useEffect, useRef, useState } from "react";
import { DEFAULT_SETTINGS, type AppSettings } from "@/lib/settings";
import { AdminSettingsTabs } from "@/components/AdminSettingsTabs";
import { Save, Upload, Trash2, Plus, X, Hash, AlertTriangle } from "lucide-react";

export default function CaiDatPage() {
  const [s, setS] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Số phiếu
  const [nextSoPhieu, setNextSoPhieu] = useState("");
  const [applyingSeq, setApplyingSeq] = useState(false);
  const [seqMsg, setSeqMsg] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d && !d.error) setS(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function set<K extends keyof AppSettings>(key: K, val: AppSettings[K]) {
    setS((prev) => ({ ...prev, [key]: val }));
  }

  function onPickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMsg("Lỗi: Tệp không phải hình ảnh.");
      return;
    }
    if (file.size > 300 * 1024) {
      setMsg("Lỗi: Logo quá lớn (>300KB). Hãy chọn ảnh nhỏ hơn.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set("logo_data_url", String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  function updateBenefit(i: number, val: string) {
    set("reg_panel_benefits", s.reg_panel_benefits.map((b, idx) => (idx === i ? val : b)));
  }
  function addBenefit() {
    set("reg_panel_benefits", [...s.reg_panel_benefits, ""]);
  }
  function removeBenefit(i: number) {
    set("reg_panel_benefits", s.reg_panel_benefits.filter((_, idx) => idx !== i));
  }

  async function save() {
    setSaving(true);
    setMsg("");
    try {
      const payload = { ...s, reg_panel_benefits: s.reg_panel_benefits.map((b) => b.trim()).filter(Boolean) };
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lưu thất bại");
      if (data.data) setS(data.data);
      setMsg("Đã lưu cấu hình. Tải lại trang để thấy thay đổi ở Header.");
    } catch (e: any) {
      setMsg("Lỗi: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function applySeq() {
    const n = Number(nextSoPhieu);
    if (!Number.isFinite(n) || n < 1) {
      setSeqMsg("Lỗi: Nhập số nguyên dương.");
      return;
    }
    if (!window.confirm(`Đặt số phiếu TIẾP THEO = #${n}? Thao tác này ảnh hưởng số phiếu mới tạo.`)) return;
    setApplyingSeq(true);
    setSeqMsg("");
    try {
      const res = await fetch("/api/settings/so-phieu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ next: n }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Thất bại");
      setSeqMsg(`Xong. Phiếu tiếp theo sẽ là #${data.next}.`);
      setNextSoPhieu("");
    } catch (e: any) {
      setSeqMsg("Lỗi: " + e.message);
    } finally {
      setApplyingSeq(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500";
  const labelCls = "mb-1.5 block text-sm font-medium text-slate-700";

  if (loading) {
    return <div className="flex-1 p-10 text-center text-slate-500">Đang tải cấu hình...</div>;
  }

  return (
    <div className="flex-1 bg-slate-100">
      <AdminSettingsTabs />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-800">Cài đặt hệ thống</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">
          Tùy biến thương hiệu, nội dung trang đăng ký và số phiếu.
        </p>

        {/* Thương hiệu */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-slate-800">Thương hiệu (Header)</h2>

          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              {s.logo_data_url ? (
                <img src={s.logo_data_url} alt="logo" className="h-full w-full object-contain" />
              ) : (
                <span className="text-xs text-slate-400">Chưa có</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input ref={fileRef} type="file" accept="image/*" onChange={onPickLogo} className="hidden" />
              <button
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Upload className="h-4 w-4" /> Chọn logo
              </button>
              {s.logo_data_url && (
                <button
                  onClick={() => set("logo_data_url", "")}
                  className="inline-flex items-center gap-2 text-xs font-medium text-red-600 hover:underline"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Xoá logo
                </button>
              )}
              <span className="text-[11px] text-slate-400">PNG/JPG, tối đa 300KB.</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Tên hệ thống</label>
              <input value={s.system_name} onChange={(e) => set("system_name", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Phụ đề</label>
              <input
                value={s.system_subtitle}
                onChange={(e) => set("system_subtitle", e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* Panel trang đăng ký */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-slate-800">Panel trang đăng ký</h2>

          <div className="space-y-4">
            <div>
              <label className={labelCls}>Tiêu đề</label>
              <input
                value={s.reg_panel_title}
                onChange={(e) => set("reg_panel_title", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Mô tả</label>
              <textarea
                value={s.reg_panel_desc}
                onChange={(e) => set("reg_panel_desc", e.target.value)}
                className={`${inputCls} h-20 resize-none`}
              />
            </div>
            <div>
              <label className={labelCls}>Các dòng lợi ích</label>
              <div className="space-y-2">
                {s.reg_panel_benefits.map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input value={b} onChange={(e) => updateBenefit(i, e.target.value)} className={inputCls} />
                    <button
                      onClick={() => removeBenefit(i)}
                      className="shrink-0 rounded-lg border border-slate-200 p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      title="Xoá dòng"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addBenefit}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:underline"
                >
                  <Plus className="h-4 w-4" /> Thêm dòng
                </button>
              </div>
            </div>
            <div>
              <label className={labelCls}>Dòng chân panel</label>
              <input
                value={s.reg_panel_footer}
                onChange={(e) => set("reg_panel_footer", e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* Lưu */}
        <div className="mb-8 flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:bg-slate-300"
          >
            <Save className="h-4 w-4" /> {saving ? "Đang lưu..." : "Lưu cấu hình"}
          </button>
          {msg && (
            <span className={`text-sm ${msg.startsWith("Lỗi") ? "text-red-600" : "text-emerald-600"}`}>{msg}</span>
          )}
        </div>

        {/* Số phiếu */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-bold text-amber-800">
            <Hash className="h-4 w-4" /> Số phiếu (reset khi lên production)
          </h2>
          <p className="mt-2 flex items-start gap-2 text-xs text-amber-700">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Đặt số phiếu bắt đầu cho các phiếu MỚI. Phải lớn hơn số phiếu lớn nhất hiện có. Không ảnh hưởng phiếu đã tạo.
          </p>
          <div className="mt-4 flex items-end gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-amber-800">Số phiếu tiếp theo</label>
              <input
                type="number"
                value={nextSoPhieu}
                onChange={(e) => setNextSoPhieu(e.target.value)}
                placeholder="Ví dụ: 1"
                className="w-40 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <button
              onClick={applySeq}
              disabled={applyingSeq || !nextSoPhieu}
              className="rounded-lg bg-amber-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-amber-700 disabled:bg-amber-300"
            >
              {applyingSeq ? "Đang đặt..." : "Áp dụng"}
            </button>
          </div>
          {seqMsg && (
            <p className={`mt-3 text-sm ${seqMsg.startsWith("Lỗi") ? "text-red-600" : "text-emerald-700"}`}>{seqMsg}</p>
          )}
        </div>
      </div>
    </div>
  );
}
