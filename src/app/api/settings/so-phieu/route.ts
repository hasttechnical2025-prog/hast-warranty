import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isAdminAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Đặt SỐ PHIẾU kế tiếp (reset khi lên production). Chỉ admin.
// Chặn nếu số mới <= số phiếu lớn nhất đang có (tránh trùng số phiếu về sau).
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { next } = await request.json();
    const n = Math.floor(Number(next));
    if (!Number.isFinite(n) || n < 1) {
      return NextResponse.json({ error: "Số phiếu tiếp theo phải là số nguyên dương" }, { status: 400 });
    }

    // Kiểm tra số phiếu lớn nhất hiện có
    const { data: maxRow } = await supabaseAdmin
      .from("pbh_phieu_bao_hanh")
      .select("so_phieu")
      .order("so_phieu", { ascending: false })
      .limit(1)
      .maybeSingle();

    const maxSoPhieu = maxRow?.so_phieu ?? 0;
    if (n <= maxSoPhieu) {
      return NextResponse.json(
        { error: `Số phiếu tiếp theo phải lớn hơn số phiếu lớn nhất đang có (#${maxSoPhieu}).` },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.rpc("pbh_set_next_so_phieu", { n });
    if (error) {
      return NextResponse.json(
        { error: "Không đặt được số phiếu. Hãy chắc chắn đã chạy migration 003. Chi tiết: " + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, next: n });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
