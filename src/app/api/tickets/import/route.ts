import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireRole } from "@/lib/session";
import { removeVietnameseTones } from "@/lib/tiengViet";

export const dynamic = "force-dynamic";

function genCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let r = "";
  for (let i = 0; i < 12; i++) r += chars.charAt(Math.floor(Math.random() * chars.length));
  return r;
}

// Nhập dữ liệu bảo hành CŨ (lịch sử) từ Excel/GSheets. CHỈ ADMIN.
// Giữ nguyên Số phiếu gốc, trạng thái = da_in. Trùng số phiếu -> bỏ qua (báo).
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole("admin");
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const rows: any[] = Array.isArray(body?.tickets) ? body.tickets : [];
    if (rows.length === 0) return NextResponse.json({ error: "Không có dòng nào" }, { status: 400 });

    const invalid: string[] = [];
    const seen = new Set<number>();
    const clean: any[] = [];

    for (const r of rows) {
      const so_phieu = Math.floor(Number(r?.so_phieu));
      const ten = String(r?.ten_khach_hang ?? "").trim();
      const model = String(r?.model_name ?? "").trim();
      if (!Number.isFinite(so_phieu) || so_phieu < 1 || !ten || !model) {
        invalid.push(String(r?.so_phieu ?? "(trống)"));
        continue;
      }
      if (seen.has(so_phieu)) continue;
      seen.add(so_phieu);
      clean.push({
        so_phieu,
        ten,
        dia_chi: String(r?.dia_chi ?? "").trim(),
        model_name: model,
        serial: r?.serial ? String(r.serial).replace(/[^a-zA-Z0-9]/g, "").toUpperCase() : null,
        cau_hinh: String(r?.cau_hinh ?? "").trim(),
        loai_san_pham: String(r?.loai_san_pham ?? "").trim() || "Máy photocopy",
        hang_sx: String(r?.hang_sx ?? "").trim(),
        dia_diem_bao_hanh: String(r?.dia_diem_bao_hanh ?? "").trim() || "Tại khách hàng",
        so_ban_chup: Number(r?.so_ban_chup) > 0 ? Math.floor(Number(r.so_ban_chup)) : 0,
        so_thang: Number(r?.so_thang) > 0 ? Math.floor(Number(r.so_thang)) : 0,
        ngay_mua: /^\d{4}-\d{2}-\d{2}$/.test(String(r?.ngay_mua ?? "")) ? r.ngay_mua : null,
      });
    }

    if (clean.length === 0) {
      return NextResponse.json({ added: 0, skipped: [], invalid, error: "Không có dòng hợp lệ." }, { status: 400 });
    }

    // Bỏ qua số phiếu đã tồn tại
    const sps = clean.map((c) => c.so_phieu);
    const { data: existing } = await supabaseAdmin.from("pbh_phieu_bao_hanh").select("so_phieu").in("so_phieu", sps);
    const existSet = new Set((existing || []).map((e: any) => e.so_phieu));
    const toIns = clean.filter((c) => !existSet.has(c.so_phieu));
    const skipped = clean.filter((c) => existSet.has(c.so_phieu)).map((c) => c.so_phieu);
    if (toIns.length === 0) return NextResponse.json({ added: 0, skipped, invalid });

    // Khách hàng: tìm/tạo theo tên chuẩn hoá (gộp 1 lượt cho nhanh)
    const nameNorm = new Map<string, string>();
    for (const c of toIns) if (!nameNorm.has(c.ten)) nameNorm.set(c.ten, removeVietnameseTones(c.ten));
    const norms = Array.from(new Set(nameNorm.values()));
    const custByNorm = new Map<string, number>();
    const { data: existCusts } = await supabaseAdmin
      .from("pbh_khach_hang")
      .select("id, ten_chuan_hoa")
      .in("ten_chuan_hoa", norms);
    for (const c of existCusts || []) custByNorm.set(c.ten_chuan_hoa, c.id);

    const missingNorms = norms.filter((n) => !custByNorm.has(n));
    if (missingNorms.length) {
      const firstByNorm = new Map<string, any>();
      for (const c of toIns) {
        const n = nameNorm.get(c.ten)!;
        if (!firstByNorm.has(n)) firstByNorm.set(n, c);
      }
      const newCusts = missingNorms.map((n) => {
        const r = firstByNorm.get(n);
        return { ten_khach_hang: r.ten, ten_chuan_hoa: n, dia_chi: r.dia_chi };
      });
      const { data: created } = await supabaseAdmin
        .from("pbh_khach_hang")
        .insert(newCusts)
        .select("id, ten_chuan_hoa");
      for (const c of created || []) custByNorm.set(c.ten_chuan_hoa, c.id);
    }

    // Dựng phiếu
    const ticketRows = toIns.map((c) => {
      const row: any = {
        so_phieu: c.so_phieu,
        khach_hang_id: custByNorm.get(nameNorm.get(c.ten)!) || null,
        ten_khach_hang: c.ten,
        dia_chi: c.dia_chi,
        model_name: c.model_name,
        loai_san_pham: c.loai_san_pham,
        hang_sx: c.hang_sx,
        cau_hinh: c.cau_hinh,
        serial: c.serial,
        so_ban_chup: c.so_ban_chup,
        so_thang: c.so_thang,
        dia_diem_bao_hanh: c.dia_diem_bao_hanh,
        nguoi_dang_ky: session.full_name,
        ma_tra_cuu: genCode(),
        trang_thai: "da_in", // dữ liệu cũ = đã cấp/đã in
      };
      if (c.ngay_mua) row.ngay_mua = c.ngay_mua;
      return row;
    });

    let { data: ins, error } = await supabaseAdmin
      .from("pbh_phieu_bao_hanh")
      .insert(ticketRows)
      .select("so_phieu");
    if (error && /nguoi_dang_ky/.test(error.message || "")) {
      const noCol = ticketRows.map(({ nguoi_dang_ky, ...r }) => r);
      ({ data: ins, error } = await supabaseAdmin.from("pbh_phieu_bao_hanh").insert(noCol).select("so_phieu"));
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ added: ins?.length || 0, skipped, invalid });
  } catch (err: any) {
    console.error("Ticket import error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
