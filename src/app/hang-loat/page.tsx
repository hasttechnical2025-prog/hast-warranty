"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DateField } from "@/components/DateField";
import { UserCheck, Plus, Trash2, ClipboardPaste, Layers, Printer, CircleCheck, AlertTriangle, ArrowLeft } from "lucide-react";

interface Model {
  id: number;
  model_name: string;
  hang_sx: string;
}
interface Row {
  model_name: string;
  serial: string;
  so_ban_chup: string;
  so_thang: string;
}

const emptyRow = (): Row => ({ model_name: "", serial: "", so_ban_chup: "", so_thang: "" });

export default function BulkRegisterPage() {
  const [nguoiDangKy, setNguoiDangKy] = useState("");
  const [role, setRole] = useState("");
  const [tenKhachHang, setTenKhachHang] = useState("");
  const [diaChi, setDiaChi] = useState("");
  const [ngayMua, setNgayMua] = useState("");
  const [diaDiem, setDiaDiem] = useState("Tại khách hàng");

  const [models, setModels] = useState<Model[]>([]);
  const [rows, setRows] = useState<Row[]>([emptyRow(), emptyRow(), emptyRow()]);
  const [pasteText, setPasteText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<{ created: { id: number; so_phieu: number }[]; skipped: string[] } | null>(null);

  useEffect(() => {
    const today = new Date();
    setNgayMua(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`);
    fetch("/api/admin/me").then((r) => r.json()).then((d) => {
      if (d.authenticated) { setNguoiDangKy(d.full_name || ""); setRole(d.role || ""); }
    }).catch(() => {});
    fetch("/api/models").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setModels(d); }).catch(() => {});
  }, []);

  const modelSet = useMemo(() => new Set(models.map((m) => m.model_name.toLowerCase())), [models]);
  const isKnown = (name: string) => !name.trim() || modelSet.has(name.trim().toLowerCase());

  const nonEmptyRows = rows.filter((r) => r.model_name.trim());
  const validRows = nonEmptyRows.filter((r) => modelSet.has(r.model_name.trim().toLowerCase()));
  const unknownRows = nonEmptyRows.filter((r) => !modelSet.has(r.model_name.trim().toLowerCase()));

  function setRow(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }
  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  function applyPaste() {
    const lines = pasteText.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (!lines.length) return;
    const split = (l: string) => (l.includes("\t") ? l.split("\t") : l.split(",")).map((c) => c.trim());
    const first = split(lines[0]).map((c) => c.toLowerCase());
    const hasHeader = first.some((c) => c.includes("model") || c.includes("serial")) && !/^\s*\S+\d/.test(lines[0]);
    const parsed: Row[] = [];
    for (let i = hasHeader ? 1 : 0; i < lines.length; i++) {
      const c = split(lines[i]);
      if (!(c[0] || "").trim()) continue;
      parsed.push({
        model_name: (c[0] || "").trim(),
        serial: (c[1] || "").trim(),
        so_ban_chup: (c[2] || "").replace(/[^\d]/g, ""),
        so_thang: (c[3] || "").replace(/[^\d]/g, ""),
      });
    }
    if (parsed.length) {
      setRows(parsed);
      setPasteText("");
    }
  }

  async function submit() {
    setErrorMsg("");
    if (!tenKhachHang.trim()) return setErrorMsg("Vui lòng nhập tên khách hàng.");
    if (!diaChi.trim()) return setErrorMsg("Vui lòng nhập địa chỉ.");
    if (validRows.length === 0) return setErrorMsg("Chưa có máy hợp lệ (model phải có trong hệ thống).");
    setSubmitting(true);
    try {
      const res = await fetch("/api/tickets/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shared: { ten_khach_hang: tenKhachHang, dia_chi: diaChi, ngay_mua: ngayMua, dia_diem_bao_hanh: diaDiem },
          machines: nonEmptyRows,
        }),
      });
      const data = await res.json();
      if (!res.ok && !data.created) throw new Error(data.error || "Tạo phiếu thất bại.");
      setResult({ created: data.created || [], skipped: data.skipped || [] });
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  function resetAll() {
    setResult(null);
    setTenKhachHang("");
    setDiaChi("");
    setRows([emptyRow(), emptyRow(), emptyRow()]);
  }

  const inputCls =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500";

  // ----- Kết quả -----
  if (result) {
    const ids = result.created.map((c) => c.id).join(",");
    const canPrint = role === "manager" || role === "admin";
    return (
      <div className="w-full flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 ring-8 ring-emerald-50">
            <CircleCheck className="h-11 w-11" />
          </div>
          <h2 className="mt-6 text-2xl font-bold text-slate-800">Đã tạo {result.created.length} phiếu</h2>
          <p className="mt-2 text-sm text-slate-500">
            {canPrint ? "Các phiếu đã sẵn sàng." : "Yêu cầu đã gửi, chờ admin duyệt trước khi in."}
          </p>
          {result.skipped.length > 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-700">
              <AlertTriangle className="mb-1 inline h-4 w-4" /> Bỏ qua {result.skipped.length} máy vì model chưa có trong hệ thống:
              <div className="mt-1 text-xs">{result.skipped.slice(0, 30).join(", ")}</div>
            </div>
          )}
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            {canPrint && result.created.length > 0 && (
              <Link
                href={`/admin/in-lo?ids=${ids}`}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700"
              >
                <Printer className="h-4 w-4" /> In hàng loạt
              </Link>
            )}
            <button onClick={resetAll} className="flex-1 rounded-xl bg-slate-100 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-200">
              Tạo lô mới
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----- Biểu mẫu -----
  return (
    <div className="w-full flex-1 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Đăng ký hàng loạt (dự án nhiều máy)</h1>
            <p className="text-sm text-slate-500">Nhập thông tin chung 1 lần, thêm danh sách máy, tạo tất cả trong một lần.</p>
          </div>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
            <ArrowLeft className="h-4 w-4" /> Đăng ký lẻ
          </Link>
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMsg}</div>
        )}

        {/* Thông tin chung */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-slate-800">1. Thông tin chung</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Người đăng ký</label>
              <div className="relative">
                <UserCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={nguoiDangKy} readOnly className={`${inputCls} pl-10 bg-slate-50 text-slate-600`} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Ngày lập phiếu</label>
              <DateField value={ngayMua} onChange={setNgayMua} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Tên khách hàng <span className="text-red-500">*</span></label>
              <input value={tenKhachHang} onChange={(e) => setTenKhachHang(e.target.value.toUpperCase())} className={inputCls} placeholder="CÔNG TY ..." />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Địa điểm bảo hành</label>
              <div className="grid grid-cols-2 gap-2">
                {["Tại khách hàng", "Tại trung tâm"].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setDiaDiem(v)}
                    className={`rounded-lg border px-2 py-2 text-sm font-medium transition ${
                      diaDiem === v ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Địa chỉ khách hàng <span className="text-red-500">*</span></label>
              <textarea value={diaChi} onChange={(e) => setDiaChi(e.target.value)} className={`${inputCls} h-16 resize-none`} placeholder="Địa chỉ..." />
            </div>
          </div>
        </div>

        {/* Danh sách máy */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-slate-800">2. Danh sách máy</h2>
            <div className="text-sm">
              <span className="font-semibold text-emerald-600">{validRows.length} hợp lệ</span>
              {unknownRows.length > 0 && <span className="ml-2 font-semibold text-red-600">{unknownRows.length} model lạ (sẽ bỏ qua)</span>}
            </div>
          </div>

          {/* Dán nhanh từ Excel */}
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
              <ClipboardPaste className="h-4 w-4" /> Dán từ Excel — cột: <b>Model · Serial · Bản chụp · Tháng</b> (Bản chụp/Tháng để trống = theo mặc định model)
            </div>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={"Apeos 3561\t600186\t\t12\nbizhub 205i\tAB123\t\t12"}
              className="h-20 w-full resize-none rounded-lg border border-slate-300 p-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={applyPaste}
              disabled={!pasteText.trim()}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-300"
            >
              <Layers className="h-4 w-4" /> Điền vào lưới
            </button>
          </div>

          {/* Lưới nhập tay */}
          <datalist id="models-dl">
            {models.map((m) => (
              <option key={m.id} value={m.model_name}>{m.hang_sx}</option>
            ))}
          </datalist>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2 w-8">#</th>
                  <th className="px-3 py-2">Model</th>
                  <th className="px-3 py-2">Serial</th>
                  <th className="px-3 py-2 w-28">Bản chụp</th>
                  <th className="px-3 py-2 w-20">Tháng</th>
                  <th className="px-3 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, i) => {
                  const bad = r.model_name.trim() && !isKnown(r.model_name);
                  return (
                    <tr key={i} className={bad ? "bg-red-50" : ""}>
                      <td className="px-3 py-1.5 text-slate-400">{i + 1}</td>
                      <td className="px-3 py-1.5">
                        <input
                          list="models-dl"
                          value={r.model_name}
                          onChange={(e) => setRow(i, { model_name: e.target.value })}
                          placeholder="Chọn/nhập model"
                          className={`w-full rounded border px-2 py-1 text-sm focus:outline-none focus:ring-2 ${
                            bad ? "border-red-300 focus:ring-red-400" : "border-slate-300 focus:ring-emerald-500"
                          }`}
                        />
                        {bad && <span className="text-[11px] text-red-600">Model chưa có — sẽ bị bỏ qua</span>}
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          value={r.serial}
                          onChange={(e) => setRow(i, { serial: e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() })}
                          className="w-full rounded border border-slate-300 px-2 py-1 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="number"
                          value={r.so_ban_chup}
                          onChange={(e) => setRow(i, { so_ban_chup: e.target.value })}
                          placeholder="mặc định"
                          className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="number"
                          value={r.so_thang}
                          onChange={(e) => setRow(i, { so_thang: e.target.value })}
                          placeholder="mặc định"
                          className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <button onClick={() => removeRow(i)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button onClick={addRow} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:underline">
            <Plus className="h-4 w-4" /> Thêm dòng
          </button>
        </div>

        <button
          onClick={submit}
          disabled={submitting || validRows.length === 0 || !tenKhachHang.trim() || !diaChi.trim()}
          className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3.5 font-bold text-white shadow-sm transition hover:from-emerald-700 hover:to-teal-700 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400"
        >
          {submitting ? "Đang tạo..." : `Tạo ${validRows.length} phiếu`}
        </button>
      </div>
    </div>
  );
}
