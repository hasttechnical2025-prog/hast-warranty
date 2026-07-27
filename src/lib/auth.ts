// Lớp tương thích: các route cũ dùng isAdminAuthenticated()/clearAdminSession().
// Nền tảng thật nằm ở lib/session.ts (phiên có vai trò).
import { requireRole, clearSessionCookie } from "@/lib/session";

export async function isAdminAuthenticated(): Promise<boolean> {
  return (await requireRole("admin")) !== null;
}

export async function clearAdminSession() {
  await clearSessionCookie();
}
