"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Printer, ArrowLeft, Eye, EyeOff, Check } from "lucide-react";
import { WarrantySheet } from "@/components/WarrantySheet";
import { DEFAULT_PROFILES, type TemplateProfile, type TicketLike } from "@/lib/print-template";

interface Ticket extends TicketLike {
  id: number;
  trang_thai: string;
  ma_tra_cuu: string;
}

export default function InLoPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [profiles, setProfiles] = useState<TemplateProfile[]>(DEFAULT_PROFILES);
  const [profileKey, setProfileKey] = useState("nua_tren");
  const [showBg, setShowBg] = useState(false);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    const ids = (new URLSearchParams(window.location.search).get("ids") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    fetch("/api/print-template").then((r) => r.json()).then((d) => {
      if (Array.isArray(d) && d.length) setProfiles(d);
    }).catch(() => {});

    if (ids.length === 0) {
      setLoading(false);
      return;
    }
    Promise.all(ids.map((id) => fetch(`/api/tickets/${id}`).then((r) => r.json())))
      .then((list) => {
        setTickets(list.filter((t) => t && !t.error));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const profile = profiles.find((p) => p.profile_key === profileKey) || profiles[0];
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  async function markAllPrinted() {
    setMarking(true);
    try {
      await Promise.all(
        tickets
          .filter((t) => t.trang_thai !== "da_in")
          .map((t) =>
            fetch(`/api/tickets/${t.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ trang_thai: "da_in" }),
            })
          )
      );
      setTickets((prev) => prev.map((t) => ({ ...t, trang_thai: "da_in" })));
    } finally {
      setMarking(false);
    }
  }

  if (loading) {
    return <div className="flex-1 p-10 text-center text-slate-500 no-print">Đang tải phiếu...</div>;
  }
  if (tickets.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-10 no-print">
        <p className="text-slate-500">Không có phiếu nào để in.</p>
        <Link href="/admin" className="rounded-lg bg-slate-200 px-4 py-2 text-slate-700">Về danh sách</Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-800">
      {/* Thanh điều khiển */}
      <div className="no-print sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 bg-slate-900 px-6 py-4 text-white">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-bold text-base">In hàng loạt — {tickets.length} phiếu</h1>
            <p className="text-xs text-slate-400">Mỗi phiếu 1 trang A5. Kiểm tra rồi in.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg bg-slate-800 p-0.5">
            {profiles.map((p) => (
              <button
                key={p.profile_key}
                onClick={() => setProfileKey(p.profile_key)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  profileKey === p.profile_key ? "bg-brand-600 text-white" : "text-slate-300 hover:text-white"
                }`}
              >
                {p.ten}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowBg((v) => !v)}
            className="flex items-center gap-1.5 rounded bg-slate-800 px-3 py-2 text-sm font-medium hover:bg-slate-700"
          >
            {showBg ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showBg ? "Ẩn phôi nền" : "Hiện phôi nền"}
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded bg-brand-600 px-4 py-2 text-sm font-semibold hover:bg-brand-700"
          >
            <Printer className="h-4 w-4" /> In tất cả (Ctrl+P)
          </button>
          <button
            onClick={markAllPrinted}
            disabled={marking}
            className="flex items-center gap-1.5 rounded bg-amber-500 px-4 py-2 text-sm font-semibold hover:bg-amber-600 disabled:opacity-50"
          >
            <Check className="h-4 w-4" /> {marking ? "..." : "Đã in tất cả"}
          </button>
        </div>
      </div>

      {/* Các phôi */}
      <div className="flex-1 overflow-auto p-6 flex flex-col items-center gap-6 no-print-bg">
        {tickets.map((t) => (
          <div key={t.id} className="batch-sheet shadow-2xl">
            <WarrantySheet
              ticket={t}
              profile={profile}
              qrUrl={`${origin}/lookup/${t.ma_tra_cuu}`}
              showBg={showBg}
              domId=""
            />
          </div>
        ))}
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          @page {
            size: A5 landscape;
            margin: 0;
          }
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          .batch-sheet {
            box-shadow: none !important;
            page-break-after: always;
            break-after: page;
          }
          .batch-sheet:last-child {
            page-break-after: auto;
            break-after: auto;
          }
        }
        .no-print-bg {
          background-image: radial-gradient(#475569 1px, transparent 1px);
          background-size: 16px 16px;
        }
      `}</style>
    </div>
  );
}
