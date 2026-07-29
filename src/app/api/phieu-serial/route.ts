import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";

// Danh sách serial đính kèm 1 phiếu (cho trang in phụ lục). Manager/admin.
export async function GET(request: NextRequest) {
  if (!(await requireRole("manager", "admin"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const phieuId = request.nextUrl.searchParams.get("phieu_id");
  if (!phieuId) return NextResponse.json({ error: "Thiếu phieu_id" }, { status: 400 });

  try {
    const { data, error } = await supabaseAdmin
      .from("pbh_phieu_serial")
      .select("serial")
      .eq("phieu_id", phieuId)
      .order("id", { ascending: true });
    if (error) return NextResponse.json({ serials: [] }); // bảng chưa migrate
    return NextResponse.json({ serials: (data || []).map((r: any) => r.serial) });
  } catch {
    return NextResponse.json({ serials: [] });
  }
}
