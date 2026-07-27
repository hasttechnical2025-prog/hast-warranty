import crypto from "crypto";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";

// Phiên đăng nhập cookie httpOnly ký HMAC-SHA256, mang theo vai trò.
// Token: base64url(payload).signature — client không tự chế được nếu không có SESSION_SECRET.

export type Role = "guest" | "manager" | "admin";
export type SessionUser = { id: number; full_name: string; role: Role };
type Payload = SessionUser & { exp: number };

export const SESSION_COOKIE = "pbh_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 ngày cho manager/admin
export const GUEST_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 5; // ~5 năm cho guest (link cá nhân)

// id = 0: admin "bootstrap" bằng ADMIN_PASSWORD khi chưa có bảng users / chưa tạo tài khoản.
export const BOOTSTRAP_ADMIN_ID = 0;

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("Thiếu biến môi trường SESSION_SECRET");
  return s;
}

function sign(data: string): string {
  return crypto.createHmac("sha256", getSecret()).update(data).digest("base64url");
}

export function createSessionToken(user: SessionUser, maxAgeSeconds: number = MAX_AGE_SECONDS): string {
  const payload: Payload = { ...user, exp: Date.now() + maxAgeSeconds * 1000 };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data)}`;
}

export function verifySessionToken(token: string): Payload | null {
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const expected = sign(data);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(data, "base64url").toString()) as Payload;
    if (!p.exp || p.exp < Date.now()) return null;
    return p;
  } catch {
    return null;
  }
}

export async function setSessionCookie(user: SessionUser, maxAgeSeconds: number = MAX_AGE_SECONDS) {
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(user, maxAgeSeconds), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<Payload | null> {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

// Trả session nếu đã đăng nhập và đúng 1 trong các role yêu cầu (rỗng = chỉ cần đăng nhập).
// Đọc lại DB để tôn trọng is_active (tắt tài khoản là chặn ngay). Admin bootstrap (id=0)
// và trường hợp bảng users chưa tồn tại thì bỏ qua bước kiểm DB.
export async function requireRole(...roles: Role[]): Promise<Payload | null> {
  const session = await getSession();
  if (!session) return null;
  if (roles.length > 0 && !roles.includes(session.role)) return null;
  if (session.id === BOOTSTRAP_ADMIN_ID) return session;

  try {
    const { data, error } = await supabaseAdmin
      .from("pbh_users")
      .select("role, is_active")
      .eq("id", session.id)
      .single();
    if (error) return session; // bảng chưa migrate -> tạm tin token
    if (!data || data.is_active === false || data.role !== session.role) return null;
  } catch {
    return session;
  }
  return session;
}
