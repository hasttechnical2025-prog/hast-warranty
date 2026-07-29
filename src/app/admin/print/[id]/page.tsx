"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Printer, Check, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { WarrantySheet } from "@/components/WarrantySheet";
import { DEFAULT_PROFILES, type TemplateProfile, type TicketLike } from "@/lib/print-template";

interface Ticket extends TicketLike {
  id: number;
  trang_thai: string;
  ma_tra_cuu: string;
}

export default function PrintTicketPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params?.id as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [profiles, setProfiles] = useState<TemplateProfile[]>(DEFAULT_PROFILES);
  const [profileKey, setProfileKey] = useState<string>("nua_tren");
  const [loading, setLoading] = useState<boolean>(true);
  const [showBg, setShowBg] = useState<boolean>(true);
  const [markingDone, setMarkingDone] = useState<boolean>(false);

  useEffect(() => {
    if (!ticketId) return;
    fetch(`/api/tickets/${ticketId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) setTicket(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading ticket for print:", err);
        setLoading(false);
      });
  }, [ticketId]);

  useEffect(() => {
    fetch("/api/print-template")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length) setProfiles(data);
      })
      .catch((err) => console.error("Error loading print template:", err));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-6 no-print">
        <p className="text-slate-500 font-medium">Đang tải dữ liệu phiếu in...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 p-6 no-print gap-4">
        <p className="text-red-500 font-medium">Không tìm thấy phiếu bảo hành yêu cầu.</p>
        <Link href="/admin" className="px-4 py-2 bg-slate-200 text-slate-800 rounded font-medium">
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  const handlePrint = () => window.print();

  const handleMarkPrinted = async () => {
    setMarkingDone(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trang_thai: "da_in" }),
      });
      if (res.ok) {
        router.push("/admin");
      } else {
        alert("Lỗi khi cập nhật trạng thái đã in.");
      }
    } catch (e) {
      alert("Không kết nối được server.");
    } finally {
      setMarkingDone(false);
    }
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "https://hast-warranty.vercel.app";
  const qrUrl = `${origin}/lookup/${ticket.ma_tra_cuu}`;
  const profile = profiles.find((p) => p.profile_key === profileKey) || profiles[0];

  return (
    <div className="flex-1 flex flex-col bg-slate-800 relative">
      {/* Thanh điều khiển (chỉ trên màn hình) */}
      <div className="bg-slate-900 border-b border-slate-700 px-6 py-4 flex flex-wrap items-center justify-between gap-4 no-print text-white">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-bold text-base">In phiếu bảo hành #{ticket.so_phieu}</h1>
            <p className="text-xs text-slate-400">{ticket.ten_khach_hang}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Chọn nửa phôi */}
          <div className="flex items-center rounded-lg bg-slate-800 p-0.5">
            {profiles.map((p) => (
              <button
                key={p.profile_key}
                onClick={() => setProfileKey(p.profile_key)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  profileKey === p.profile_key
                    ? "bg-brand-600 text-white"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                {p.ten}
              </button>
            ))}
          </div>

          <Link
            href="/admin/can-phoi"
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm font-medium transition"
            title="Kéo-thả căn chỉnh vị trí các trường"
          >
            Căn phôi
          </Link>

          {Number((ticket as any).so_may) > 1 && (
            <Link
              href={`/admin/phu-luc/${ticket.id}`}
              className="flex items-center gap-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-700 rounded text-sm font-semibold transition"
              title="In danh sách serial đính kèm"
            >
              <Printer className="h-4 w-4" /> Phụ lục serial
            </Link>
          )}

          <button
            onClick={() => setShowBg(!showBg)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded text-sm font-medium transition"
            title="Bật/Tắt phôi mờ nền để đối chiếu"
          >
            {showBg ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span>{showBg ? "Ẩn phôi nền" : "Hiện phôi nền"}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded text-sm font-semibold transition shadow-sm"
          >
            <Printer className="h-4 w-4" />
            <span>In Phiếu (Ctrl+P)</span>
          </button>

          {ticket.trang_thai !== "da_in" && (
            <button
              onClick={handleMarkPrinted}
              disabled={markingDone}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded text-sm font-semibold transition shadow-sm disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              <span>{markingDone ? "Đang xử lý..." : "Xác nhận đã in"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Vùng làm việc canh giữa tờ A5 */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-8 bg-slate-700 no-print-bg">
        <div className="shadow-2xl">
          <WarrantySheet ticket={ticket} profile={profile} qrUrl={qrUrl} showBg={showBg} />
        </div>
      </div>

      {/* CSS xử lý window.print() */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #a5-print-sheet,
          #a5-print-sheet * {
            visibility: visible;
          }
          #a5-print-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            width: 210mm !important;
            height: 148mm !important;
            background-color: transparent !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A5 landscape;
            margin: 0;
          }
          html,
          body {
            background-color: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
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
