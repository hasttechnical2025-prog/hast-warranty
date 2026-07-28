"use client";

import React, { useEffect, useState } from "react";
import { WarrantySheet } from "@/components/WarrantySheet";
import {
  DEFAULT_PROFILES,
  type FieldDef,
  type TemplateProfile,
  type TicketLike,
} from "@/lib/print-template";
import { AdminSettingsTabs } from "@/components/AdminSettingsTabs";
import { Save, Copy, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";

const SAMPLE: TicketLike = {
  so_phieu: 4279,
  ngay_mua: "2026-07-27",
  ten_khach_hang: "Công ty ABC",
  dia_chi: "123 phố XYZ, Phường KLM, tỉnh OPQ",
  model_name: "Apeos 3561",
  loai_san_pham: "Máy photocopy",
  hang_sx: "Fujifilm",
  cau_hinh: "Copy-In-Quét",
  serial: "600186",
  dia_diem_bao_hanh: "Tại khách hàng",
  so_ban_chup: 100000,
  so_thang: 12,
  ma_tra_cuu: "DEMO",
};

export default function CanPhoiPage() {
  const [profiles, setProfiles] = useState<TemplateProfile[]>(DEFAULT_PROFILES);
  const [activeKey, setActiveKey] = useState<string>("nua_tren");
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [sample, setSample] = useState<TicketLike>(SAMPLE);
  const [showBg, setShowBg] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    fetch("/api/print-template")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d) && d.length) setProfiles(d);
      })
      .catch(() => {});
    // lấy 1 phiếu thật làm mẫu (nếu có)
    fetch("/api/tickets")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d) && d.length) setSample(d[0]);
      })
      .catch(() => {});
  }, []);

  const active = profiles.find((p) => p.profile_key === activeKey) || profiles[0];
  const selField = active.fields.find((f) => f.key === selectedField) || null;

  function updateActive(patch: Partial<TemplateProfile>) {
    setProfiles((prev) => prev.map((p) => (p.profile_key === activeKey ? { ...p, ...patch } : p)));
  }

  function updateField(key: string, patch: Partial<FieldDef>) {
    updateActive({
      fields: active.fields.map((f) => (f.key === key ? { ...f, ...patch } : f)),
    });
  }

  function nudgeField(dx: number, dy: number) {
    if (!selField) return;
    updateField(selField.key, {
      x: Math.round((selField.x + dx) * 10) / 10,
      y: Math.round((selField.y + dy) * 10) / 10,
    });
  }

  function copyFromOther() {
    const other = profiles.find((p) => p.profile_key !== activeKey);
    if (!other) return;
    updateActive({ fields: other.fields.map((f) => ({ ...f })), font_pt: other.font_pt });
    setMsg(`Đã sao chép toạ độ từ "${other.ten}". Nhớ bấm Lưu.`);
  }

  async function save() {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/print-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(active),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lưu thất bại");
      setMsg(`Đã lưu hồ sơ "${active.ten}".`);
    } catch (e: any) {
      setMsg("Lỗi: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  const numCls =
    "w-20 rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <div className="flex-1 bg-slate-100">
      <AdminSettingsTabs />
      <div className="mx-auto max-w-[1200px] px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800">Căn phôi in</h1>
            <p className="text-xs text-slate-500">
              Kéo các khối vào đúng vị trí trên phôi, hoặc chọn khối rồi nhích bằng nút. Lưu để áp dụng khi in.
            </p>
          </div>
          <button
            onClick={() => setShowBg(!showBg)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {showBg ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showBg ? "Ẩn phôi nền" : "Hiện phôi nền"}
          </button>
        </div>

        {/* Tabs hồ sơ */}
        <div className="mb-4 flex items-center gap-2">
          {profiles.map((p) => (
            <button
              key={p.profile_key}
              onClick={() => {
                setActiveKey(p.profile_key);
                setSelectedField(null);
              }}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeKey === p.profile_key
                  ? "bg-brand-600 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {p.ten}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Khổ phôi */}
          <div className="overflow-auto rounded-xl border border-slate-300 bg-white p-3 shadow-sm">
            <WarrantySheet
              ticket={sample}
              profile={active}
              qrUrl="https://demo"
              showBg={showBg}
              editable
              selectedKey={selectedField}
              onSelectField={setSelectedField}
              onMoveField={(key, x, y) => updateField(key, { x, y })}
            />
          </div>

          {/* Bảng điều khiển */}
          <div className="w-full lg:w-[320px] shrink-0 space-y-4">
            {/* Khối đang chọn */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-2 text-sm font-bold text-slate-800">Khối đang chọn</h3>
              {selField ? (
                <>
                  <div className="mb-3 text-sm font-medium text-brand-700">{selField.label}</div>
                  <div className="mb-3 flex items-center gap-3">
                    <label className="flex items-center gap-1 text-xs text-slate-600">
                      X
                      <input
                        type="number"
                        step={0.5}
                        value={selField.x}
                        onChange={(e) => updateField(selField.key, { x: Number(e.target.value) })}
                        className={numCls}
                      />
                    </label>
                    <label className="flex items-center gap-1 text-xs text-slate-600">
                      Y
                      <input
                        type="number"
                        step={0.5}
                        value={selField.y}
                        onChange={(e) => updateField(selField.key, { y: Number(e.target.value) })}
                        className={numCls}
                      />
                    </label>
                    <span className="text-[11px] text-slate-400">mm</span>
                  </div>

                  {/* Nút nhích 0.5mm */}
                  <div className="mb-3 grid w-28 grid-cols-3 grid-rows-3 gap-1">
                    <span />
                    <NudgeBtn onClick={() => nudgeField(0, -0.5)}><ChevronUp className="h-4 w-4" /></NudgeBtn>
                    <span />
                    <NudgeBtn onClick={() => nudgeField(-0.5, 0)}><ChevronLeft className="h-4 w-4" /></NudgeBtn>
                    <span className="flex items-center justify-center text-[10px] text-slate-400">0.5</span>
                    <NudgeBtn onClick={() => nudgeField(0.5, 0)}><ChevronRight className="h-4 w-4" /></NudgeBtn>
                    <span />
                    <NudgeBtn onClick={() => nudgeField(0, 0.5)}><ChevronDown className="h-4 w-4" /></NudgeBtn>
                    <span />
                  </div>

                  {selField.key !== "qr" && (
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1 text-xs text-slate-600">
                        Cỡ chữ
                        <input
                          type="number"
                          step={0.5}
                          value={selField.fontPt ?? active.font_pt}
                          onChange={(e) => updateField(selField.key, { fontPt: Number(e.target.value) })}
                          className={numCls}
                        />
                        pt
                      </label>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-slate-400">Bấm vào một khối trên phôi để chọn.</p>
              )}
            </div>

            {/* Danh sách khối để chọn nhanh */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-2 text-sm font-bold text-slate-800">Chọn nhanh khối</h3>
              <div className="flex flex-wrap gap-1.5">
                {active.fields.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setSelectedField(f.key)}
                    className={`rounded-md px-2 py-1 text-[11px] transition ${
                      selectedField === f.key
                        ? "bg-brand-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chỉnh chung */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-2 text-sm font-bold text-slate-800">Chỉnh chung cả phiếu</h3>
              <div className="mb-3 flex items-center gap-3">
                <label className="flex items-center gap-1 text-xs text-slate-600">
                  Dịch X
                  <input
                    type="number"
                    step={0.5}
                    value={active.offset_x}
                    onChange={(e) => updateActive({ offset_x: Number(e.target.value) })}
                    className={numCls}
                  />
                </label>
                <label className="flex items-center gap-1 text-xs text-slate-600">
                  Dịch Y
                  <input
                    type="number"
                    step={0.5}
                    value={active.offset_y}
                    onChange={(e) => updateActive({ offset_y: Number(e.target.value) })}
                    className={numCls}
                  />
                </label>
              </div>
              <p className="mb-3 text-[11px] text-slate-400">
                Dùng để bù sai số máy in — dịch toàn bộ trường một lượt.
              </p>
              <label className="flex items-center gap-1 text-xs text-slate-600">
                Cỡ chữ mặc định
                <input
                  type="number"
                  step={0.5}
                  value={active.font_pt}
                  onChange={(e) => updateActive({ font_pt: Number(e.target.value) })}
                  className={numCls}
                />
                pt
              </label>
            </div>

            {/* Hành động */}
            <div className="space-y-2">
              <button
                onClick={copyFromOther}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Copy className="h-4 w-4" /> Sao chép toạ độ từ nửa kia
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 disabled:bg-slate-300"
              >
                <Save className="h-4 w-4" /> {saving ? "Đang lưu..." : `Lưu hồ sơ "${active.ten}"`}
              </button>
              {msg && (
                <p
                  className={`text-center text-xs ${
                    msg.startsWith("Lỗi") ? "text-red-600" : "text-brand-600"
                  }`}
                >
                  {msg}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NudgeBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-brand-50 hover:text-brand-700"
    >
      {children}
    </button>
  );
}
