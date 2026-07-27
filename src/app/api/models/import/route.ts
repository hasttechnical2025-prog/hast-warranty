import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isAdminAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Nhập hàng loạt model. Bỏ qua model đã tồn tại (báo lại danh sách trùng).
// Body: { models: [{ model_name, hang_sx, loai_san_pham?, cau_hinh?, so_ban_chup_mac_dinh?, so_thang_mac_dinh? }] }
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const rows: any[] = Array.isArray(body?.models) ? body.models : [];
    if (rows.length === 0) {
      return NextResponse.json({ error: "Không có dòng dữ liệu nào." }, { status: 400 });
    }

    const invalid: string[] = []; // dòng thiếu tên model hoặc hãng
    const seen = new Set<string>();
    const clean: any[] = [];

    for (const r of rows) {
      const model_name = String(r?.model_name ?? "").trim();
      const hang_sx = String(r?.hang_sx ?? "").trim();
      if (!model_name || !hang_sx) {
        invalid.push(model_name || "(trống)");
        continue;
      }
      const key = model_name.toLowerCase();
      if (seen.has(key)) continue; // trùng ngay trong tệp -> giữ dòng đầu
      seen.add(key);

      clean.push({
        model_name,
        hang_sx,
        loai_san_pham: String(r?.loai_san_pham ?? "").trim() || "Máy photocopy",
        cau_hinh: String(r?.cau_hinh ?? "").trim() || "Copy-In-Quét",
        so_ban_chup_mac_dinh: Number(r?.so_ban_chup_mac_dinh) > 0 ? Math.floor(Number(r.so_ban_chup_mac_dinh)) : 100000,
        so_thang_mac_dinh: Number(r?.so_thang_mac_dinh) > 0 ? Math.floor(Number(r.so_thang_mac_dinh)) : 12,
      });
    }

    if (clean.length === 0) {
      return NextResponse.json({ added: 0, skipped: [], invalid, error: "Không có dòng hợp lệ để nhập." }, { status: 400 });
    }

    // Lọc trùng với DB
    const names = clean.map((m) => m.model_name);
    const { data: existingRows } = await supabaseAdmin
      .from("pbh_models")
      .select("model_name")
      .in("model_name", names);
    const existing = new Set((existingRows || []).map((e: any) => e.model_name.toLowerCase()));

    const toInsert = clean.filter((m) => !existing.has(m.model_name.toLowerCase()));
    const skipped = clean.filter((m) => existing.has(m.model_name.toLowerCase())).map((m) => m.model_name);

    let added = 0;
    if (toInsert.length > 0) {
      const { data, error } = await supabaseAdmin.from("pbh_models").insert(toInsert).select("id");
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      added = data?.length || 0;
    }

    return NextResponse.json({ added, skipped, invalid });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
