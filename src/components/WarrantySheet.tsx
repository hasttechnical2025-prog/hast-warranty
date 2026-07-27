"use client";

import React, { useLayoutEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  SHEET_W_MM,
  SHEET_H_MM,
  fieldContent,
  type FieldDef,
  type TemplateProfile,
  type TicketLike,
} from "@/lib/print-template";

interface WarrantySheetProps {
  ticket: TicketLike;
  profile: TemplateProfile;
  qrUrl: string;
  showBg: boolean;
  /** Chế độ căn phôi: cho kéo-thả + hiện khối rỗng */
  editable?: boolean;
  selectedKey?: string | null;
  onSelectField?: (key: string) => void;
  onMoveField?: (key: string, x: number, y: number) => void;
}

// Một ô chữ trên phôi. Tự thu nhỏ cỡ chữ nếu nội dung vượt quá bề rộng (w).
function FieldText({
  def,
  content,
  baseFontPt,
  editable,
}: {
  def: FieldDef;
  content: string;
  baseFontPt: number;
  editable?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const targetPt = def.fontPt || baseFontPt;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.fontSize = targetPt + "pt";
    // Chỉ thu nhỏ khi có giới hạn bề rộng và nội dung tràn
    if (def.w) {
      let s = targetPt;
      let guard = 0;
      while (el.scrollWidth > el.clientWidth + 0.5 && s > 6 && guard < 60) {
        s -= 0.5;
        el.style.fontSize = s + "pt";
        guard++;
      }
    }
  }, [content, targetPt, def.w]);

  const showPlaceholder = editable && !content;

  return (
    <div
      ref={ref}
      className={def.mono ? "font-mono" : undefined}
      style={{
        width: def.w ? def.w + "mm" : undefined,
        textAlign: def.align || "left",
        fontWeight: def.bold ? 700 : 400,
        lineHeight: 1.1,
        whiteSpace: "nowrap",
        overflow: "hidden",
        letterSpacing: def.mono ? "0.5px" : undefined,
        color: showPlaceholder ? "#94a3b8" : "#0f172a",
        fontStyle: showPlaceholder ? "italic" : undefined,
        pointerEvents: "none",
      }}
    >
      {showPlaceholder ? def.label : content}
    </div>
  );
}

export function WarrantySheet({
  ticket,
  profile,
  qrUrl,
  showBg,
  editable = false,
  selectedKey = null,
  onSelectField,
  onMoveField,
}: WarrantySheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [bgError, setBgError] = React.useState(false);

  // Kéo-thả 1 field (chỉ ở chế độ editable)
  function startDrag(e: React.MouseEvent, f: FieldDef) {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();
    onSelectField?.(f.key);
    const rect = sheetRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pxmm = rect.width / SHEET_W_MM;
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = f.x;
    const origY = f.y;
    const move = (ev: MouseEvent) => {
      const nx = origX + (ev.clientX - startX) / pxmm;
      const ny = origY + (ev.clientY - startY) / pxmm;
      onMoveField?.(f.key, Math.round(nx * 10) / 10, Math.round(ny * 10) / 10);
    };
    const up = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  }

  return (
    <div
      id="a5-print-sheet"
      ref={sheetRef}
      className="relative bg-white text-black font-sans overflow-hidden select-none print-layout"
      style={{
        width: SHEET_W_MM + "mm",
        height: SHEET_H_MM + "mm",
        minWidth: SHEET_W_MM + "mm",
        minHeight: SHEET_H_MM + "mm",
      }}
    >
      {/* Ảnh phôi nền: chỉ trên màn hình để canh, KHÔNG in ra (no-print) */}
      {showBg && !bgError && profile.bg_src && (
        <img
          src={profile.bg_src}
          alt=""
          onError={() => setBgError(true)}
          className="absolute inset-0 h-full w-full opacity-45 pointer-events-none no-print"
          style={{ objectFit: "fill" }}
        />
      )}
      {showBg && (bgError || !profile.bg_src) && (
        <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none no-print">
          <div className="max-w-xs rounded-lg border border-dashed border-slate-300 bg-white/80 px-4 py-3 text-center text-[11px] leading-relaxed text-slate-500">
            Chưa có ảnh phôi nền cho hồ sơ này. Đặt ảnh scan vào{" "}
            <span className="font-mono font-semibold text-slate-700">
              public{profile.bg_src || "/phoi-....png"}
            </span>
            .
          </div>
        </div>
      )}

      {/* Các trường */}
      {profile.fields.map((f) => {
        const left = f.x + profile.offset_x;
        const top = f.y + profile.offset_y;
        const isSel = editable && selectedKey === f.key;
        return (
          <div
            key={f.key}
            onMouseDown={(e) => startDrag(e, f)}
            className="absolute"
            style={{
              left: left + "mm",
              top: top + "mm",
              cursor: editable ? "move" : "default",
              // khung chọn/hover ở chế độ căn phôi
              outline: editable ? (isSel ? "1.5px solid #059669" : "1px dashed #cbd5e1") : undefined,
              outlineOffset: editable ? "1px" : undefined,
              background: isSel ? "rgba(5,150,105,0.06)" : undefined,
              zIndex: isSel ? 5 : 1,
              // vùng bấm tối thiểu cho khối rỗng khi căn
              minWidth: editable && !f.w ? "6mm" : undefined,
              minHeight: editable ? "4mm" : undefined,
            }}
          >
            {f.key === "qr" ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                <QRCodeSVG value={qrUrl} size={45} level="M" />
                <span style={{ fontSize: "7px", color: "#666", fontWeight: "bold" }}>QUÉT TRA CỨU</span>
              </div>
            ) : (
              <FieldText def={f} content={fieldContent(f.key, ticket)} baseFontPt={profile.font_pt} editable={editable} />
            )}
          </div>
        );
      })}
    </div>
  );
}
