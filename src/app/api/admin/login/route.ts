import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { setAdminAuthenticated } from "@/lib/auth";

// So sánh chuỗi theo kiểu chống rò rỉ thời gian (timing-safe).
function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    const correctPassword = process.env.ADMIN_PASSWORD;
    if (!correctPassword) {
      // Không có mật khẩu cấu hình → từ chối, không dùng mật khẩu mặc định.
      console.error("Thiếu biến môi trường ADMIN_PASSWORD");
      return NextResponse.json({ error: "Hệ thống chưa cấu hình mật khẩu admin" }, { status: 500 });
    }

    if (typeof password === "string" && safeEqual(password, correctPassword)) {
      await setAdminAuthenticated();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Mật khẩu không chính xác" }, { status: 401 });
  } catch (err: any) {
    console.error("Lỗi đăng nhập admin:", err);
    return NextResponse.json({ error: "Lỗi hệ thống khi đăng nhập" }, { status: 500 });
  }
}
