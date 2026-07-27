"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { Printer, Check, ArrowLeft, Eye, EyeOff } from "lucide-react";

// Ảnh phôi nền để đối chiếu vị trí trên màn hình (KHÔNG in ra).
// Đặt file scan/crop đúng khổ A5 ngang vào public/ theo đúng tên này.
const PHOI_TEMPLATE_SRC = "/phoi-bao-hanh.png";

interface Ticket {
  id: number;
  so_phieu: number;
  ngay_mua: string;
  ten_khach_hang: string;
  dia_chi: string;
  model_name: string;
  loai_san_pham: string;
  hang_sx: string;
  cau_hinh: string;
  serial: string | null;
  dia_diem_bao_hanh: string;
  so_ban_chup: number;
  so_thang: number;
  trang_thai: string;
  ma_tra_cuu: string;
}

export default function PrintTicketPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params?.id as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showBg, setShowBg] = useState<boolean>(true);
  const [bgError, setBgError] = useState<boolean>(false);
  const [markingDone, setMarkingDone] = useState<boolean>(false);

  useEffect(() => {
    if (!ticketId) return;
    fetch(`/api/tickets/${ticketId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setTicket(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading ticket for print:", err);
        setLoading(false);
      });
  }, [ticketId]);

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

  // Parse date pieces
  const dateObj = new Date(ticket.ngay_mua);
  const dayStr = String(dateObj.getDate()).padStart(2, "0");
  const monthStr = String(dateObj.getMonth() + 1).padStart(2, "0");
  const yearStr = String(dateObj.getFullYear());

  const handlePrint = () => {
    window.print();
  };

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

  // Generate lookup link for QR Code
  const origin = typeof window !== "undefined" ? window.location.origin : "https://hast-warranty.vercel.app";
  const qrUrl = `${origin}/lookup/${ticket.ma_tra_cuu}`;

  return (
    <div className="flex-1 flex flex-col bg-slate-800 relative">
      {/* Control Panel (Screen-only, Hidden when printing) */}
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
          {/* Background Toggle */}
          <button
            onClick={() => setShowBg(!showBg)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded text-sm font-medium transition"
            title="Bật/Tắt phôi mờ nền để đối chiếu"
          >
            {showBg ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span>{showBg ? "Ẩn phôi nền" : "Hiện phôi nền"}</span>
          </button>

          {/* Trigger Print */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded text-sm font-semibold transition shadow-sm"
          >
            <Printer className="h-4 w-4" />
            <span>In Phiếu (Ctrl+P)</span>
          </button>

          {/* Mark status as Printed */}
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

      {/* Outer Workspace to center the A5 container on screen */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-8 bg-slate-700 no-print-bg">
        {/*
          A5 Printing Sheet Container (210mm x 148mm)
          - Screen: centering, shadow, border
          - Print: borderless, marginless, fixed absolute sizing
        */}
        <div
          id="a5-print-sheet"
          className="relative bg-white text-black font-sans shadow-2xl overflow-hidden select-none print-layout"
          style={{
            width: "210mm",
            height: "148mm",
            minWidth: "210mm",
            minHeight: "148mm",
            maxWidth: "210mm",
            maxHeight: "148mm",
          }}
        >
          {/* Ảnh phôi nền: chỉ hiển thị trên màn hình để canh khớp, KHÔNG in ra (no-print) */}
          {showBg && !bgError && (
            <img
              src={PHOI_TEMPLATE_SRC}
              alt=""
              onError={() => setBgError(true)}
              className="absolute inset-0 h-full w-full opacity-45 pointer-events-none select-none no-print"
              style={{ objectFit: "fill" }}
            />
          )}

          {/* Chưa có ảnh phôi -> hướng dẫn thay vì im lặng */}
          {showBg && bgError && (
            <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none no-print">
              <div className="max-w-xs rounded-lg border border-dashed border-slate-300 bg-white/80 px-4 py-3 text-center text-[11px] leading-relaxed text-slate-500">
                Chưa có ảnh phôi nền. Hãy quét/chụp mẫu phôi A5, lưu vào{" "}
                <span className="font-mono font-semibold text-slate-700">public/phoi-bao-hanh.png</span>{" "}
                rồi tải lại trang để đối chiếu vị trí các trường.
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PRINT FIELD LAYOUT WITH EXACT POSITIONING IN MM                           */}
          {/* ========================================================================= */}

          {/* QR Code top-left empty corner */}
          <div
            className="absolute"
            style={{
              top: "27mm",
              left: "10mm",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "2px",
            }}
          >
            <QRCodeSVG value={qrUrl} size={45} level="M" />
            <span style={{ fontSize: "7px", color: "#666", fontWeight: "bold" }}>QUÉT TRA CỨU</span>
          </div>

          {/* Số phiếu: Số phiếu: 4278 */}
          <div
            className="absolute font-bold text-slate-800"
            style={{
              top: "27.9mm",
              left: "170mm",
              fontSize: "14px",
            }}
          >
            {ticket.so_phieu}
          </div>

          {/* Ngày tháng năm: Ngày ...... tháng ...... năm ...... */}
          {/* Ngày */}
          <div
            className="absolute font-semibold text-slate-800 text-center"
            style={{
              top: "33mm",
              left: "163mm",
              width: "10mm",
              fontSize: "13px",
            }}
          >
            {dayStr}
          </div>

          {/* Tháng */}
          <div
            className="absolute font-semibold text-slate-800 text-center"
            style={{
              top: "33mm",
              left: "182mm",
              width: "10mm",
              fontSize: "13px",
            }}
          >
            {monthStr}
          </div>

          {/* Năm */}
          <div
            className="absolute font-semibold text-slate-800 text-center"
            style={{
              top: "33mm",
              left: "195mm",
              width: "14mm",
              fontSize: "13px",
            }}
          >
            {yearStr}
          </div>

          {/* Tên Khách hàng: BAN QUẢN LÝ DỰ ÁN... */}
          <div
            className="absolute font-bold text-slate-900 overflow-hidden text-ellipsis"
            style={{
              top: "42.9mm",
              left: "45mm",
              width: "150mm",
              fontSize: "13.5px",
              lineHeight: "1.2",
              whiteSpace: "nowrap",
            }}
          >
            {ticket.ten_khach_hang.toUpperCase()}
          </div>

          {/* Địa chỉ: SỐ 03A, Đường Tạ An Khương... */}
          <div
            className="absolute font-semibold text-slate-800 overflow-hidden text-ellipsis"
            style={{
              top: "48.4mm",
              left: "24mm",
              width: "172mm",
              fontSize: "13px",
              lineHeight: "1.2",
              whiteSpace: "nowrap",
            }}
          >
            {ticket.dia_chi}
          </div>

          {/* Đại diện Khách hàng: (Có thể để trống hoặc điền dấu gạch ngang) */}
          <div
            className="absolute text-slate-800"
            style={{
              top: "55.2mm",
              left: "51mm",
              fontSize: "13px",
            }}
          >
            -
          </div>

          {/* Điện thoại: (Để trống) */}
          <div
            className="absolute text-slate-800"
            style={{
              top: "55.2mm",
              left: "122mm",
              fontSize: "13px",
            }}
          >
            -
          </div>

          {/* Loại sản phẩm: Máy photocopy */}
          <div
            className="absolute font-medium text-slate-800"
            style={{
              top: "61.1mm",
              left: "41mm",
              fontSize: "13px",
            }}
          >
            {ticket.loai_san_pham}
          </div>

          {/* Hãng sản xuất: Fujifilm */}
          <div
            className="absolute font-medium text-slate-800"
            style={{
              top: "61.1mm",
              left: "129mm",
              fontSize: "13px",
            }}
          >
            {ticket.hang_sx}
          </div>

          {/* Model: Apeos 3561 */}
          <div
            className="absolute font-bold text-slate-900"
            style={{
              top: "67mm",
              left: "22mm",
              fontSize: "14px",
            }}
          >
            {ticket.model_name}
          </div>

          {/* Số serial: 600186 */}
          <div
            className="absolute font-bold text-slate-900"
            style={{
              top: "67mm",
              left: "125mm",
              fontSize: "14px",
              letterSpacing: "0.5px",
            }}
          >
            {ticket.serial || "-"}
          </div>

          {/* Cấu hình sản phẩm: Copy-In-Quét */}
          <div
            className="absolute font-medium text-slate-800"
            style={{
              top: "73.6mm",
              left: "48mm",
              fontSize: "13px",
            }}
          >
            {ticket.cau_hinh}
          </div>

          {/* Địa điểm bảo hành: */}
          {/* [ ] Tại Trung tâm bảo hành */}
          {ticket.dia_diem_bao_hanh === "Tại trung tâm" && (
            <div
              className="absolute font-bold text-slate-800"
              style={{
                top: "85.5mm",
                left: "28mm",
                fontSize: "14px",
              }}
            >
              ✓
            </div>
          )}

          {/* [✓] Tại Khách hàng */}
          {ticket.dia_diem_bao_hanh === "Tại khách hàng" && (
            <div
              className="absolute font-bold text-slate-800"
              style={{
                top: "85.5mm",
                left: "116mm",
                fontSize: "14px",
              }}
            >
              ✓
            </div>
          )}

          {/* Chế độ bảo hành: ... bản chụp/in hoặc: 12 tháng */}
          {/* Hạn mức số bản chụp */}
          <div
            className="absolute font-bold text-slate-900 text-center"
            style={{
              top: "92.2mm",
              left: "42mm",
              width: "25mm",
              fontSize: "13px",
            }}
          >
            {ticket.so_ban_chup.toLocaleString("vi-VN")}
          </div>

          {/* Số tháng */}
          <div
            className="absolute font-bold text-slate-900 text-center"
            style={{
              top: "92.2mm",
              left: "106mm",
              width: "12mm",
              fontSize: "13px",
            }}
          >
            {ticket.so_thang}
          </div>

          {/* ========================================================================= */}
        </div>
      </div>

      {/* Global CSS injected to handle window.print() perfectly */}
      <style jsx global>{`
        @media print {
          /* Hide everything except the print sheet */
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
          /* Configure landscape output on A5 */
          @page {
            size: A5 landscape;
            margin: 0;
          }
          html, body {
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
