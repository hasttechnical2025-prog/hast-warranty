import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

// Trả thông tin phiên hiện tại (vai trò, tên). Dùng cho Header & các trang.
export async function GET() {
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ authenticated: false, role: null });
    return NextResponse.json({
      authenticated: true,
      role: s.role,
      full_name: s.full_name,
      isAdmin: s.role === "admin",
    });
  } catch {
    return NextResponse.json({ authenticated: false, role: null });
  }
}
