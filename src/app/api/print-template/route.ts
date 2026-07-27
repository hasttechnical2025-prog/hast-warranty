import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isAdminAuthenticated } from "@/lib/auth";
import { DEFAULT_PROFILES, mergeProfile, type TemplateProfile } from "@/lib/print-template";

export const dynamic = "force-dynamic";

// GET: trả về CẢ 2 hồ sơ căn phôi. Công khai (trang in cần đọc để render).
// Nếu bảng chưa tạo hoặc chưa có dữ liệu -> trả toạ độ mặc định trong code.
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.from("pbh_print_template").select("*");
    if (error) {
      // Bảng có thể chưa được migrate -> dùng mặc định
      return NextResponse.json(DEFAULT_PROFILES);
    }
    const rows = data || [];
    const profiles = DEFAULT_PROFILES.map((def) => {
      const row = rows.find((r: any) => r.profile_key === def.profile_key);
      return row ? mergeProfile(def, row) : def;
    });
    return NextResponse.json(profiles);
  } catch {
    return NextResponse.json(DEFAULT_PROFILES);
  }
}

// POST: lưu (upsert) 1 hồ sơ. Chỉ admin.
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const p = (await request.json()) as TemplateProfile;
    if (!p?.profile_key || !Array.isArray(p.fields)) {
      return NextResponse.json({ error: "Dữ liệu hồ sơ không hợp lệ" }, { status: 400 });
    }

    const payload = {
      profile_key: p.profile_key,
      ten: p.ten || p.profile_key,
      offset_x: Number(p.offset_x) || 0,
      offset_y: Number(p.offset_y) || 0,
      font_pt: Number(p.font_pt) || 12,
      bg_src: p.bg_src || "",
      fields: p.fields,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from("pbh_print_template")
      .upsert(payload, { onConflict: "profile_key" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
