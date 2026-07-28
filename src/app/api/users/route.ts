import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { requireRole } from "@/lib/session";
import { hashPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

function genToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

// GET: danh sách người dùng (chỉ admin).
export async function GET() {
  if (!(await requireRole("admin"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data, error } = await supabaseAdmin
    .from("pbh_users")
    .select("id, username, full_name, role, is_active, login_token, created_at")
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST: tạo mới hoặc cập nhật người dùng (chỉ admin).
export async function POST(request: NextRequest) {
  if (!(await requireRole("admin"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { id, full_name, role, username, password, is_active, regen_token } = body;

    if (!full_name || !String(full_name).trim()) {
      return NextResponse.json({ error: "Vui lòng nhập họ tên" }, { status: 400 });
    }
    if (!["guest", "manager", "admin"].includes(role)) {
      return NextResponse.json({ error: "Vai trò không hợp lệ" }, { status: 400 });
    }

    const payload: any = { full_name: String(full_name).trim(), role };
    // Guest không có tên đăng nhập (đăng nhập bằng link). Tránh lưu chuỗi "null".
    if (role === "guest") {
      payload.username = null;
    } else if (username !== undefined && username !== null) {
      payload.username = String(username).trim() || null;
    }
    if (typeof is_active === "boolean") payload.is_active = is_active;
    if (password) payload.password = hashPassword(String(password));

    // Guest luôn cần login_token; tạo mới khi tạo tài khoản hoặc khi yêu cầu tạo lại
    if (role === "guest" && (!id || regen_token)) {
      payload.login_token = genToken();
    }

    let result;
    if (id) {
      result = await supabaseAdmin.from("pbh_users").update(payload).eq("id", id).select().single();
    } else {
      if (role !== "guest") {
        if (!payload.username) return NextResponse.json({ error: "Vai trò này cần tên đăng nhập" }, { status: 400 });
        if (!payload.password) return NextResponse.json({ error: "Vai trò này cần mật khẩu" }, { status: 400 });
      }
      if (role === "guest" && !payload.login_token) payload.login_token = genToken();
      result = await supabaseAdmin.from("pbh_users").insert(payload).select().single();
    }

    if (result.error) {
      if (result.error.code === "23505") {
        return NextResponse.json({ error: `Tên đăng nhập "${payload.username}" đã tồn tại.` }, { status: 409 });
      }
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }
    return NextResponse.json(result.data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE ?id : xoá người dùng (chỉ admin, không xoá admin cuối cùng).
export async function DELETE(request: NextRequest) {
  if (!(await requireRole("admin"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Thiếu ID" }, { status: 400 });

  const { data: target } = await supabaseAdmin.from("pbh_users").select("role").eq("id", id).maybeSingle();
  if (target?.role === "admin") {
    const { count } = await supabaseAdmin
      .from("pbh_users")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: "Không thể xoá admin cuối cùng." }, { status: 400 });
    }
  }

  const { error } = await supabaseAdmin.from("pbh_users").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
