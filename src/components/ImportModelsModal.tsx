"use client";

import React, { useMemo, useRef, useState } from "react";
import { X, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle } from "lucide-react";

interface ParsedModel {
  model_name: string;
  cau_hinh: string;
  loai_san_pham: string;
  hang_sx: string;
  so_ban_chup_mac_dinh: number;
  so_thang_mac_dinh: number;
}

interface ImportResult {
  added: number;
  skipped: string[];
  invalid: string[];
}

interface Props {
  onClose: () => void;
  onImported: () => void;
}

function parseNum(s: string): number {
  const digits = (s || "").replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

function splitLine(line: string): string[] {
  return (line.includes("\t") ? line.split("\t") : line.split(",")).map((c) => c.trim());
}

function idxOf(cells: string[], ...keys: string[]): number {
  return cells.findIndex((c) => keys.some((k) => c.includes(k)));
}

// Phân tích văn bản dán/tải thành danh sách model.
function parseText(text: string): { models: ParsedModel[]; blankSkipped: number } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (!lines.length) return { models: [], blankSkipped: 0 };

  const first = splitLine(lines[0]).map((c) => c.toLowerCase());
  const hasHeader =
    first.some((c) => c.includes("tên máy") || c.includes("model") || c.includes("hãng")) &&
    !/^\s*\d/.test(lines[0]);

  let colMap: Record<string, number>;
  let start = 0;
  if (hasHeader) {
    start = 1;
    colMap = {
      model_name: idxOf(first, "tên máy", "model"),
      cau_hinh: idxOf(first, "cấu hình"),
      loai_san_pham: idxOf(first, "sản phẩm", "loại"),
      hang_sx: idxOf(first, "hãng"),
      so_ban_chup: idxOf(first, "bản chụp", "bản in"),
      so_thang: idxOf(first, "tháng"),
    };
  } else {
    // Thứ tự mặc định theo mẫu: Tên máy | Cấu hình | Sản phẩm | Hãng SX | Địa điểm | Bản chụp | Tháng
    colMap = { model_name: 0, cau_hinh: 1, loai_san_pham: 2, hang_sx: 3, so_ban_chup: 5, so_thang: 6 };
  }

  const g = (cells: string[], key: string) => {
    const i = colMap[key];
    return i != null && i >= 0 ? cells[i] ?? "" : "";
  };

  const models: ParsedModel[] = [];
  let blankSkipped = 0;
  for (let i = start; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    const model_name = (g(cells, "model_name") || "").trim();
    if (!model_name) {
      blankSkipped++;
      continue;
    }
    models.push({
      model_name,
      cau_hinh: (g(cells, "cau_hinh") || "").trim(),
      loai_san_pham: (g(cells, "loai_san_pham") || "").trim(),
      hang_sx: (g(cells, "hang_sx") || "").trim(),
      so_ban_chup_mac_dinh: parseNum(g(cells, "so_ban_chup")),
      so_thang_mac_dinh: parseNum(g(cells, "so_thang")),
    });
  }
  return { models, blankSkipped };
}

export function ImportModelsModal({ onClose, onImported }: Props) {
  const [text, setText] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => parseText(text), [text]);
  const noHang = parsed.models.filter((m) => !m.hang_sx).length;

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result || ""));
    reader.readAsText(file, "utf-8");
  }

  async function doImport() {
    if (!parsed.models.length) return;
    setImporting(true);
    setErrorMsg("");
    setResult(null);
    try {
      const res = await fetch("/api/models/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ models: parsed.models }),
      });
      const data = await res.json();
      if (!res.ok && !data.added) throw new Error(data.error || "Nhập thất bại");
      setResult({ added: data.added || 0, skipped: data.skipped || [], invalid: data.invalid || [] });
      if (data.added > 0) onImported();
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-brand-600 px-5 py-3 text-white">
          <h2 className="flex items-center gap-2 font-bold">
            <FileSpreadsheet className="h-5 w-5" /> Nhập nhiều model từ Excel/CSV
          </h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-white/15">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {/* Hướng dẫn */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
            <p className="font-semibold text-slate-700">Cách nhanh nhất:</p>
            Trong Excel, bôi đen vùng dữ liệu (kể cả dòng tiêu đề) → <b>Ctrl+C</b> → dán vào ô dưới.
            <br />
            Cột theo thứ tự: <b>Tên máy · Cấu hình · Sản phẩm · Hãng SX · Địa điểm · Bản chụp · Tháng</b>.
            Bắt buộc có <b>Tên máy</b> và <b>Hãng SX</b>. Model đã tồn tại sẽ được bỏ qua.
          </div>

          <div className="flex items-center gap-3">
            <input ref={fileRef} type="file" accept=".csv,.txt,text/csv" onChange={onFile} className="hidden" />
            <button
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Upload className="h-4 w-4" /> Chọn tệp .csv
            </button>
            <span className="text-xs text-slate-400">hoặc dán trực tiếp bên dưới</span>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Dán dữ liệu từ Excel vào đây...\nAR300C\tHủy tài liệu\tMáy hủy tài liệu\tAsmix\ttại Khách hàng\t\t12"}
            className="h-40 w-full resize-none rounded-lg border border-slate-300 p-3 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
          />

          {/* Xem trước */}
          {text.trim() && (
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-3 text-sm">
                <span className="font-semibold text-slate-700">
                  Đọc được {parsed.models.length} model
                </span>
                {parsed.blankSkipped > 0 && (
                  <span className="text-slate-400">· bỏ {parsed.blankSkipped} dòng trống</span>
                )}
                {noHang > 0 && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <AlertTriangle className="h-3.5 w-3.5" /> {noHang} dòng thiếu Hãng SX (sẽ bị bỏ)
                  </span>
                )}
              </div>
              {parsed.models.length > 0 && (
                <div className="max-h-48 overflow-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-3 py-1.5">Model</th>
                        <th className="px-3 py-1.5">Hãng</th>
                        <th className="px-3 py-1.5">Loại</th>
                        <th className="px-3 py-1.5">Cấu hình</th>
                        <th className="px-3 py-1.5">Bản chụp</th>
                        <th className="px-3 py-1.5">Tháng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsed.models.slice(0, 50).map((m, i) => (
                        <tr key={i} className={!m.hang_sx ? "bg-amber-50" : ""}>
                          <td className="px-3 py-1.5 font-semibold text-slate-800">{m.model_name}</td>
                          <td className="px-3 py-1.5">{m.hang_sx || "—"}</td>
                          <td className="px-3 py-1.5">{m.loai_san_pham || "—"}</td>
                          <td className="px-3 py-1.5">{m.cau_hinh || "—"}</td>
                          <td className="px-3 py-1.5">
                            {m.so_ban_chup_mac_dinh > 0 ? m.so_ban_chup_mac_dinh.toLocaleString("vi-VN") : "—"}
                          </td>
                          <td className="px-3 py-1.5">{m.so_thang_mac_dinh || 12}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{errorMsg}</div>
          )}

          {/* Kết quả */}
          {result && (
            <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm">
              <p className="flex items-center gap-2 font-semibold text-brand-700">
                <CheckCircle2 className="h-4 w-4" /> Đã thêm {result.added} model mới.
              </p>
              {result.skipped.length > 0 && (
                <p className="mt-1 text-slate-600">
                  Bỏ qua {result.skipped.length} model đã tồn tại: {result.skipped.slice(0, 20).join(", ")}
                  {result.skipped.length > 20 ? "..." : ""}
                </p>
              )}
              {result.invalid.length > 0 && (
                <p className="mt-1 text-amber-600">Bỏ {result.invalid.length} dòng thiếu Tên máy/Hãng SX.</p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">
            {result ? "Đóng" : "Hủy"}
          </button>
          <button
            onClick={doImport}
            disabled={importing || parsed.models.length === 0}
            className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 disabled:bg-slate-300"
          >
            {importing ? "Đang nhập..." : `Nhập ${parsed.models.length || ""} model`}
          </button>
        </div>
      </div>
    </div>
  );
}
