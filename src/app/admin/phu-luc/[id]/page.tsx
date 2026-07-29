"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Printer, ArrowLeft } from "lucide-react";
import { DEFAULT_SETTINGS, type AppSettings } from "@/lib/settings";

// Số dòng/cột và số cột theo khổ (điều chỉnh ở đây nếu cần)
const LAYOUT = {
  A4: { cols: 4, rowsPerCol: 44, w: "210mm", h: "297mm" },
  A5: { cols: 2, rowsPerCol: 24, w: "148mm", h: "210mm" },
};

function fmtDate(s: string) {
  const p = (s || "").slice(0, 10).split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : "";
}

export default function PhuLucPage() {
  const { id } = useParams() as { id: string };
  const [ticket, setTicket] = useState<any>(null);
  const [serials, setSerials] = useState<string[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [sizeMode, setSizeMode] = useState<"auto" | "A4" | "A5">("auto");

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/tickets/${id}`).then((r) => r.json()),
      fetch(`/api/phieu-serial?phieu_id=${id}`).then((r) => r.json()),
      fetch(`/api/settings`).then((r) => r.json()),
    ])
      .then(([t, s, cfg]) => {
        if (t && !t.error) setTicket(t);
        setSerials(Array.isArray(s?.serials) ? s.serials : []);
        if (cfg && !cfg.error) setSettings(cfg);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const size: "A4" | "A5" = sizeMode === "auto" ? (serials.length <= 40 ? "A5" : "A4") : sizeMode;
  const L = LAYOUT[size];

  const pages = useMemo(() => {
    const perPage = L.cols * L.rowsPerCol;
    const out: { stt: number; serial: string }[][][] = [];
    for (let p = 0; p * perPage < serials.length; p++) {
      const items = serials.slice(p * perPage, (p + 1) * perPage).map((s, i) => ({ stt: p * perPage + i + 1, serial: s }));
      const columns: { stt: number; serial: string }[][] = [];
      for (let c = 0; c < L.cols; c++) columns.push(items.slice(c * L.rowsPerCol, (c + 1) * L.rowsPerCol));
      out.push(columns);
    }
    return out;
  }, [serials, L.cols, L.rowsPerCol]);

  if (loading) return <div className="flex-1 p-10 text-center text-slate-500 no-print">Đang tải phụ lục...</div>;
  if (!ticket)
    return (
      <div className="flex-1 flex flex-col items-center gap-4 p-10 no-print">
        <p className="text-slate-500">Không tìm thấy phiếu.</p>
        <Link href="/admin" className="rounded-lg bg-slate-200 px-4 py-2 text-slate-700">Về danh sách</Link>
      </div>
    );

  return (
    <div className="flex-1 flex flex-col bg-slate-700">
      {/* Điều khiển */}
      <div className="no-print sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 bg-slate-900 px-6 py-4 text-white">
        <div className="flex items-center gap-3">
          <Link href={`/admin/print/${id}`} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-bold text-base">Phụ lục serial — phiếu #{ticket.so_phieu}</h1>
            <p className="text-xs text-slate-400">
              {serials.length} serial · {pages.length} trang {size}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg bg-slate-800 p-0.5">
            {(["auto", "A4", "A5"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setSizeMode(m)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  sizeMode === m ? "bg-brand-600 text-white" : "text-slate-300 hover:text-white"
                }`}
              >
                {m === "auto" ? "Tự chọn" : m}
              </button>
            ))}
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded bg-brand-600 px-4 py-2 text-sm font-semibold hover:bg-brand-700"
          >
            <Printer className="h-4 w-4" /> In phụ lục (Ctrl+P)
          </button>
        </div>
      </div>

      {/* Các trang */}
      <div className="flex-1 overflow-auto p-6 flex flex-col items-center gap-6">
        {serials.length === 0 && (
          <div className="rounded-lg bg-white px-6 py-4 text-slate-500">Phiếu này không có danh sách serial.</div>
        )}
        {pages.map((columns, pi) => (
          <div key={pi} className="app-page bg-white shadow-2xl text-black" style={{ width: L.w, minHeight: L.h }}>
            {/* Letterhead */}
            {settings.letterhead_data_url ? (
              <img src={settings.letterhead_data_url} alt="letterhead" className="mx-auto max-h-[26mm] w-full object-contain" />
            ) : (
              <div className="border-b-2 border-slate-800 pb-2 text-center">
                <div className="text-lg font-bold text-slate-900">{settings.system_name}</div>
                <div className="text-xs text-slate-500">{settings.system_subtitle}</div>
              </div>
            )}

            {/* Tiêu đề */}
            <div className="mt-3 text-center">
              <div className="text-base font-bold uppercase text-slate-900">SERIAL {ticket.model_name}</div>
              <div className="text-sm italic text-slate-700">
                (Đính kèm phiếu bảo hành số {ticket.so_phieu} ngày {fmtDate(ticket.ngay_mua)})
              </div>
            </div>

            {/* Bảng nhiều cột */}
            <div className="mt-3 flex justify-center gap-2">
              {columns.map((col, ci) => (
                <table key={ci} className="border-collapse text-[10px]" style={{ width: `${100 / L.cols}%` }}>
                  <thead>
                    <tr>
                      <th className="border border-slate-400 bg-slate-100 px-1 py-0.5 font-bold">STT</th>
                      <th className="border border-slate-400 bg-slate-100 px-2 py-0.5 font-bold">SERIAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {col.map((it) => (
                      <tr key={it.stt}>
                        <td className="border border-slate-400 px-1 py-0.5 text-center">{it.stt}</td>
                        <td className="border border-slate-400 px-2 py-0.5 text-center font-mono">{it.serial}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ))}
            </div>

            <div className="mt-3 text-right text-[10px] text-slate-500">
              Trang {pi + 1}/{pages.length}
            </div>
          </div>
        ))}
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: ${size} portrait; margin: 0; }
          html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
          .app-page {
            box-shadow: none !important;
            page-break-after: always;
            break-after: page;
          }
          .app-page:last-child { page-break-after: auto; break-after: auto; }
        }
        .app-page {
          padding: 12mm;
        }
      `}</style>
    </div>
  );
}
