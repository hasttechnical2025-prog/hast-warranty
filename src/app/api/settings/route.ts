import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isAdminAuthenticated } from "@/lib/auth";
import { DEFAULT_SETTINGS, mergeSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

// GET: công khai (Header & trang đăng ký cần đọc). Fallback về mặc định nếu chưa migrate.
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("pbh_app_settings")
      .select("data")
      .eq("id", 1)
      .single();
    if (error) return NextResponse.json(DEFAULT_SETTINGS);
    return NextResponse.json(mergeSettings(data?.data));
  } catch {
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}

// POST: lưu cấu hình (chỉ admin).
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const clean = mergeSettings(body);

    const { error } = await supabaseAdmin
      .from("pbh_app_settings")
      .upsert({ id: 1, data: clean, updated_at: new Date().toISOString() }, { onConflict: "id" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, data: clean });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
