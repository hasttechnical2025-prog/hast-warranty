import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const isAuth = await isAdminAuthenticated();
    return NextResponse.json({ isAdmin: isAuth });
  } catch (err) {
    return NextResponse.json({ isAdmin: false });
  }
}
