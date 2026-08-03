"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import { X, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Info } from "lucide-react";

interface ParsedTicket {
  ngay_mua: string; // YYYY-MM-DD | ""
  ten_khach_hang: string;
  dia_chi: string;
  model_name: string;
  serial: string;
  dia_diem_bao_hanh: string;
  so_ban_chup: string;
  so_thang: string;
}

interface Props {
  onClose: () => void;
  onImported: () => void;
}

function splitLine(line: string): string[] {
  return (line.includes("\t") ? line.split("\t") : line.split(",")).map((c) => c.trim());
}

function idxOf(cells: string[], ...keys: string[]): number {
  return cells.findIndex((c) => keys.some((k) => c.includes(k)));
}

function parseDate(s: string): string {
  const t = (s || "").trim();
  let m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  return "";
}

function digits(s: string): string {
  return (s || "").replace(/[^\d]/g, "");
}

function parse(text: string): { rows: ParsedTicket[]; hadHeader: boolean } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (!lines.length) return { rows: [], hadHeader: false };

  const first = splitLine(lines[0]).map((c) => c.toLowerCase());
  const hadHeader =
    first.some((c) => c.includes("tên khách") || c.includes("serial") || c.includes("tên máy") || c.includes("model")) &&
    !/^\d/.test(lines[0].trim());

  let col: Record<string, number>;
  if (hadHeader) {
    col = {
      ngay_mua: idxOf(first, "ngày mua", "ngày"),
      ten: idxOf(first, "tên khách", "khách hàng"),
      dia_chi: idxOf(first, "địa chỉ"),
      tinh: idxOf(first, "tỉnh", "tp"),
      model: idxOf(first, "tên máy", "model"),
      serial: idxOf(first, "serial"),
      dia_diem: idxOf(first, "địa điểm"),
      ban_chup: idxOf(first, "bản chụp", "bản in"),
      thang: idxOf(first, "thời gian", "tháng"),
    };
  } else {
    // Thứ tự mặc định: Ngày mua · Tên KH · Địa chỉ · Tỉnh/TP · Model · Serial · Địa điểm · Bản chụp · Tháng
    col = { ngay_mua: 0, ten: 1, dia_chi: 2, tinh: 3, model: 4, serial: 5, dia_diem: 6, ban_chup: 7, thang: 8 };
  }

  const g = (cells: string[], key: string) => {
    const i = col[key];
    return i != null && i >= 0 ? (cells[i] ?? "").trim() : "";
  };

  const rows: ParsedTicket[] = [];
  for (let i = hadHeader ? 1 : 0; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    const ten = g(cells, "ten");
    const model = g(cells, "model");
    if (!ten && !model) continue; // dòng trống
    const tinh = g(cells, "tinh");
    const dc = g(cells, "dia_chi");
    rows.push({
      ngay_mua: parseDate(g(cells, "ngay_mua")),
      ten_khach_hang: ten,
      dia_chi: [dc, tinh].filter(Boolean).join(", "),
      model_name: model,
      serial: g(cells, "serial"),
      dia_diem_bao_hanh: g(cells, "dia_diem"),
      so_ban_chup: digits(g(cells, "ban_chup")),
      so_thang: digits(g(cells, "thang")),
    });
  }
  return { rows, hadHeader };
}

export function ImportSalesTicketsModal({ onClose, onImported }: Props) {
  const [text, setText] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ added: number; invalid: string[] } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Tải trước danh sách model để so khớp
  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          setModels(d.map((m) => m.model_name.toLowerCase()));
        }
      })
      .catch(() => {});
  }, []);

  const { rows, hadHeader } = useMemo(() => parse(text), [text]);

  // Kiểm tra tính hợp lệ của phiếu
  const valid = rows.filter((r) => r.ten_khach_hang && r.model_name && models.includes(r.model_name.toLowerCase().trim()));
  const invalidCount = rows.length - valid.length;

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result || ""));
    reader.readAsText(f, "utf-8");
  }

  async function doImport() {
    if (!valid.length) return;
    setImporting(true);
    setErrorMsg("");
    setResult(null);
    try {
      const res = await fetch("/api/tickets/sales-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tickets: valid }),
      });
      const data = await res.json();
      if (!res.ok && !data.added) throw new Error(data.error || "Nhập dữ liệu thất bại");
      setResult({ added: data.added || 0, invalid: data.invalid || [] });
      if (data.added > 0) {
        onImported();
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-brand-600 px-5 py-3 text-white">
          <h2 className="flex items-center gap-2 font-bold">
            <FileSpreadsheet className="h-5 w-5" /> Nhập Excel nhiều khách hàng / nhiều máy
          </h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-white/15">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nội dung */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
            Bôi đen dữ liệu trong Excel/Google Sheets <b>(bao gồm dòng tiêu đề)</b> → <code>Ctrl+C</code> → dán vào khung dưới.
            <br />
            Tiêu đề cột được nhận diện: <b>Ngày mua · Tên khách hàng · Địa chỉ · Tỉnh/TP · Model · Serial · Địa điểm · Bản chụp · Tháng</b>.
            <br />
            * Lưu ý: Số phiếu sẽ tự động được hệ sinh thái cấp tăng dần. Trạng thái sau import: <b>Chờ duyệt</b>.
          </div>

          <div className="flex items-center gap-3">
            <input ref={fileRef} type="file" accept=".csv,.txt,text/csv" onChange={onFile} className="hidden" />
            <button
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Upload className="h-4 w-4" /> Chọn tệp .csv / .txt
            </button>
            <span className="text-xs text-slate-400">hoặc dán trực tiếp từ Clipboard</span>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Dán dữ liệu (kèm dòng tiêu đề) từ Excel tại đây..."
            className="h-40 w-full resize-none rounded-lg border border-slate-300 p-3 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
          />

          {text.trim() && (
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-3 text-sm">
                <span className="font-semibold text-brand-700">{valid.length} phiếu hợp lệ để import</span>
                {invalidCount > 0 && (
                  <span className="flex items-center gap-1 text-amber-600 text-xs font-semibold">
                    <AlertTriangle className="h-4 w-4" /> {invalidCount} dòng lỗi (thiếu tên KH/Model hoặc Model chưa có trong hệ thống)
                  </span>
                )}
                {!hadHeader && (
                  <span className="flex items-center gap-1 text-slate-400 text-xs">
                    <Info className="h-3.5 w-3.5" /> Không tìm thấy tiêu đề dòng — đọc theo thứ tự cột mặc định
                  </span>
                )}
              </div>

              {valid.length > 0 && (
                <div className="max-h-52 overflow-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-3 py-1.5">Khách hàng</th>
                        <th className="px-3 py-1.5">Địa chỉ</th>
                        <th className="px-3 py-1.5">Model máy</th>
                        <th className="px-3 py-1.5">Serial</th>
                        <th className="px-3 py-1.5">Ngày mua</th>
                        <th className="px-3 py-1.5">Bản chụp / Tháng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {valid.slice(0, 50).map((r, i) => (
                        <tr key={i}>
                          <td className="px-3 py-1.5 font-medium text-slate-800">{r.ten_khach_hang}</td>
                          <td className="px-3 py-1.5 truncate max-w-[150px]">{r.dia_chi || "—"}</td>
                          <td className="px-3 py-1.5">{r.model_name}</td>
                          <td className="px-3 py-1.5 font-mono">{r.serial || "—"}</td>
                          <td className="px-3 py-1.5">{r.ngay_mua || "—"}</td>
                          <td className="px-3 py-1.5 text-slate-500">
                            {r.so_ban_chup ? `${r.so_ban_chup} tr` : "mặc định"} / {r.so_thang ? `${r.so_thang} thg` : "mặc định"}
                          </td>
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

          {result && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
              <p className="flex items-center gap-2 font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> Đã gửi thành công {result.added} yêu cầu cấp phiếu bảo hành.
              </p>
              {result.invalid.length > 0 && (
                <div className="mt-2 text-xs text-amber-700 bg-amber-50 rounded p-2">
                  <b>Bỏ qua {result.invalid.length} dòng lỗi / không hợp lệ:</b>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5">
                    {result.invalid.slice(0, 10).map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                    {result.invalid.length > 10 && <li>... và {result.invalid.length - 10} dòng khác</li>}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">
            {result ? "Đóng" : "Hủy"}
          </button>
          <button
            onClick={doImport}
            disabled={importing || valid.length === 0}
            className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 disabled:bg-slate-300"
          >
            {importing ? "Đang gửi duyệt..." : `Nhập ${valid.length || ""} phiếu`}
          </button>
        </div>
      </div>
    </div>
  );
}
