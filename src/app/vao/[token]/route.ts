import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { setSessionCookie, GUEST_MAX_AGE_SECONDS, type Role } from "@/lib/session";

// Đăng nhập bằng LINK/QR cá nhân: /vao/<token>
// Mở link -> tạo phiên (guest: lâu dài) -> chuyển tới trang đăng ký.
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const origin = request.nextUrl.origin;

  try {
    const { data: user } = await supabaseAdmin
      .from("pbh_users")
      .select("id, full_name, role, is_active")
      .eq("login_token", token)
      .maybeSingle();

    if (!user || user.is_active === false) {
      return NextResponse.redirect(new URL("/admin/login?e=link", origin));
    }

    const maxAge = user.role === "guest" ? GUEST_MAX_AGE_SECONDS : 60 * 60 * 24 * 7;
    await setSessionCookie({ id: user.id, full_name: user.full_name, role: user.role as Role }, maxAge);
    return NextResponse.redirect(new URL("/", origin));
  } catch {
    return NextResponse.redirect(new URL("/admin/login?e=link", origin));
  }
}
