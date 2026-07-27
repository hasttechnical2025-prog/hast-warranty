import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware chạy ở edge -> Web Crypto (khớp chữ ký với lib/session.ts).
// Chỉ là lớp chặn UX (redirect); lớp bảo vệ thật nằm ở từng API route (requireRole).

function base64UrlToString(data: string): string {
  const b64 = data.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  return atob(padded);
}
function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

type Payload = { id: number; full_name: string; role: 'guest' | 'manager' | 'admin'; exp: number };

async function verifyToken(token: string, secret: string): Promise<Payload | null> {
  const [data, sig] = token.split('.');
  if (!data || !sig) return null;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  if (bytesToBase64Url(new Uint8Array(mac)) !== sig) return null;
  try {
    const p = JSON.parse(base64UrlToString(data)) as Payload;
    if (!p.exp || p.exp < Date.now()) return null;
    return p;
  } catch {
    return null;
  }
}

const ADMIN_ONLY = ['/admin/models', '/admin/can-phoi', '/admin/cai-dat', '/admin/nguoi-dung'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Trang đăng nhập luôn mở
  if (pathname.startsWith('/admin/login')) return NextResponse.next();

  const token = request.cookies.get('pbh_session')?.value;
  const secret = process.env.SESSION_SECRET;
  const session = token && secret ? await verifyToken(token, secret) : null;

  const loginUrl = new URL('/admin/login', request.url);

  // Trang đăng ký: chỉ cần đã đăng nhập (bất kỳ vai trò)
  if (pathname === '/') {
    if (!session) return NextResponse.redirect(loginUrl);
    return NextResponse.next();
  }

  // Khu admin
  if (pathname.startsWith('/admin')) {
    if (!session) return NextResponse.redirect(loginUrl);
    // Guest không được vào khu admin
    if (session.role === 'guest') return NextResponse.redirect(new URL('/', request.url));
    // Một số trang chỉ dành cho admin
    if (ADMIN_ONLY.some((p) => pathname.startsWith(p)) && session.role !== 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/admin/:path*'],
};
