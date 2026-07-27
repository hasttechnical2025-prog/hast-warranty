import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware chạy ở edge runtime → dùng Web Crypto (crypto.subtle), không dùng
// node:crypto. Chữ ký phải khớp với lib/auth.ts (HMAC-SHA256, digest base64url).
// Đây là lớp chặn cho UX (redirect trang /admin); lớp bảo vệ thật nằm ở từng API route.

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToString(data: string): string {
  const b64 = data.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  return atob(padded);
}

async function verifyToken(token: string, secret: string): Promise<boolean> {
  const [data, sig] = token.split('.');
  if (!data || !sig) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  const expected = bytesToBase64Url(new Uint8Array(mac));
  if (expected !== sig) return false;

  try {
    const payload = JSON.parse(base64UrlToString(data)) as { exp?: number };
    return !!payload.exp && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bảo vệ mọi route /admin trừ /admin/login
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const token = request.cookies.get('pbh_admin_token')?.value;
    const secret = process.env.SESSION_SECRET;

    const ok = !!token && !!secret && (await verifyToken(token, secret));
    if (!ok) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
