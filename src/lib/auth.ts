import crypto from "crypto";
import { cookies } from "next/headers";

// Phiên đăng nhập admin dùng cookie httpOnly có ký HMAC-SHA256.
// Token dạng: base64url(payload).signature — client không thể tự chế token hợp lệ
// nếu không biết SESSION_SECRET. Chạy trên Node runtime (API routes + server components).

const PBH_ADMIN_COOKIE = "pbh_admin_token";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 ngày

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("Thiếu biến môi trường SESSION_SECRET");
  }
  return secret;
}

function sign(data: string): string {
  return crypto.createHmac("sha256", getSecret()).update(data).digest("base64url");
}

export function createSessionToken(maxAgeSeconds: number = MAX_AGE_SECONDS): string {
  const payload = { exp: Date.now() + maxAgeSeconds * 1000 };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data)}`;
}

function verifySessionToken(token: string): boolean {
  const [data, sig] = token.split(".");
  if (!data || !sig) return false;

  const expected = sign(data);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as { exp?: number };
    return !!payload.exp && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export async function isAdminAuthenticated(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(PBH_ADMIN_COOKIE)?.value;
    if (!token) return false;
    return verifySessionToken(token);
  } catch {
    return false;
  }
}

export async function setAdminAuthenticated() {
  const cookieStore = await cookies();
  cookieStore.set(PBH_ADMIN_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(PBH_ADMIN_COOKIE);
}
