import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";

// Đếm số phiếu theo trạng thái (cho StatCards). Manager/admin.
export async function GET() {
  if (!(await requireRole("manager", "admin"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const statuses = ["cho_duyet", "cho_in", "da_in"] as const;
    const out: Record<string, number> = {};
    await Promise.all(
      statuses.map(async (s) => {
        const { count } = await supabaseAdmin
          .from("pbh_phieu_bao_hanh")
          .select("id", { count: "exact", head: true })
          .eq("trang_thai", s);
        out[s] = count || 0;
      })
    );
    out.total = (out.cho_duyet || 0) + (out.cho_in || 0) + (out.da_in || 0);
    return NextResponse.json(out);
  } catch (err: any) {
    return NextResponse.json({ cho_duyet: 0, cho_in: 0, da_in: 0, total: 0 });
  }
}
