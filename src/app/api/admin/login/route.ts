import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyPassword, hashPassword } from "@/lib/password";
import { setSessionCookie, BOOTSTRAP_ADMIN_ID, type Role } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    if (!password) {
      return NextResponse.json({ error: "Vui lòng nhập mật khẩu" }, { status: 400 });
    }

    // 1) Tài khoản trong DB (manager/admin đăng nhập bằng username + mật khẩu)
    if (username) {
      try {
        const { data: user } = await supabaseAdmin
          .from("pbh_users")
          .select("id, full_name, role, password, is_active")
          .eq("username", String(username).trim())
          .maybeSingle();
        if (user) {
          if (user.is_active === false) {
            return NextResponse.json({ error: "Tài khoản đã bị khoá" }, { status: 403 });
          }
          if (user.password && verifyPassword(password, user.password)) {
            const u = { id: user.id, full_name: user.full_name, role: user.role as Role };
            await setSessionCookie(u);
            return NextResponse.json({ role: u.role, full_name: u.full_name });
          }
        }
      } catch {
        /* bảng có thể chưa migrate -> rơi xuống master fallback */
      }
    }

    // 2) Master fallback: ADMIN_PASSWORD -> admin (khởi tạo admin đầu tiên / phòng khi quên)
    const master = process.env.ADMIN_PASSWORD;
    if (master && password === master) {
      try {
        const { data: adminUser, error } = await supabaseAdmin
          .from("pbh_users")
          .select("id, full_name")
          .eq("role", "admin")
          .limit(1)
          .maybeSingle();
        if (!error) {
          if (adminUser) {
            await setSessionCookie({ id: adminUser.id, full_name: adminUser.full_name, role: "admin" });
            return NextResponse.json({ role: "admin", full_name: adminUser.full_name });
          }
          // Chưa có admin -> tạo tài khoản admin đầu tiên
          const { data: created } = await supabaseAdmin
            .from("pbh_users")
            .insert({
              username: (username && String(username).trim()) || "admin",
              full_name: "Quản trị viên",
              role: "admin",
              password: hashPassword(master),
            })
            .select("id, full_name")
            .single();
          if (created) {
            await setSessionCookie({ id: created.id, full_name: created.full_name, role: "admin" });
            return NextResponse.json({ role: "admin", full_name: created.full_name });
          }
        }
      } catch {
        /* bảng chưa migrate */
      }
      // Bảng users chưa tồn tại -> admin bootstrap (id = 0)
      await setSessionCookie({ id: BOOTSTRAP_ADMIN_ID, full_name: "Quản trị viên", role: "admin" });
      return NextResponse.json({ role: "admin", full_name: "Quản trị viên" });
    }

    return NextResponse.json({ error: "Sai tên đăng nhập hoặc mật khẩu" }, { status: 401 });
  } catch (err: any) {
    console.error("Lỗi đăng nhập:", err);
    return NextResponse.json({ error: "Lỗi hệ thống khi đăng nhập" }, { status: 500 });
  }
}
