"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Award, ShieldAlert, List, LogOut, SlidersHorizontal } from "lucide-react";
import { DEFAULT_SETTINGS, type AppSettings } from "@/lib/settings";

type Role = "guest" | "manager" | "admin" | null;

const SETTINGS_ROUTES = ["/admin/cai-dat", "/admin/models", "/admin/can-phoi", "/admin/nguoi-dung"];
const ROLE_LABEL: Record<string, string> = { guest: "GUEST", manager: "MANAGER", admin: "ADMIN" };

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<Role>(null);
  const [fullName, setFullName] = useState<string>("");
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => { if (d && !d.error) setSettings(d); }).catch(() => {});
  }, [pathname]);

  useEffect(() => {
    fetch("/api/admin/me").then((r) => r.json()).then((d) => {
      setRole(d.authenticated ? d.role : null);
      setFullName(d.full_name || "");
    }).catch(() => setRole(null));
  }, [pathname]);

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/admin/logout", { method: "POST" });
      if (res.ok) { setRole(null); router.push("/admin/login"); }
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const isManagerUp = role === "manager" || role === "admin";
  const isAdmin = role === "admin";

  const pill = (active: boolean) =>
    `flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
      active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
    }`;

  // Ẩn hoàn toàn Header tại trang tra cứu của khách hàng (đặc biệt cần thiết khi trang bị lỗi 404 để khách hàng thấy trắng hoàn toàn)
  if (pathname?.startsWith("/lookup")) {
    return null;
  }

  return (
    <header className="no-print px-3 pt-3 sm:px-4 sm:pt-4">
      <div className="mx-auto max-w-7xl rounded-2xl border border-slate-200 bg-white px-4 sm:px-5 shadow-sm">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Trái: logo + tên + tài khoản */}
          <div className="flex items-center gap-3 min-w-0">
            {settings.logo_data_url ? (
              <img src={settings.logo_data_url} alt="logo" className="h-10 w-10 shrink-0 rounded-lg object-contain" />
            ) : (
              <div className="shrink-0 rounded-lg bg-brand-600 p-2 text-white">
                <Award className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate text-base font-bold leading-tight text-slate-800 sm:text-lg">
                {settings.system_name}
              </div>
              <div className="truncate text-xs leading-tight text-slate-500">
                {role ? (
                  <>
                    Tài khoản: <span className="font-semibold text-slate-700">{fullName}</span>{" "}
                    <span className="font-semibold text-brand-600">({ROLE_LABEL[role]})</span>
                  </>
                ) : (
                  settings.system_subtitle
                )}
              </div>
            </div>
          </div>

          {/* Phải: tab pill + đăng xuất */}
          <nav className="flex items-center gap-1">
            {role && (
              <Link href="/" className={pill(pathname === "/" || pathname === "/hang-loat")}>
                <ShieldAlert className="h-4 w-4" />
                <span className="hidden sm:inline">Đăng ký</span>
              </Link>
            )}
            {isManagerUp && (
              <Link href="/admin" className={pill(pathname === "/admin" || pathname.startsWith("/admin/print") || pathname.startsWith("/admin/in-lo"))}>
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Duyệt &amp; In</span>
              </Link>
            )}
            {isAdmin && (
              <Link href="/admin/cai-dat" className={pill(SETTINGS_ROUTES.some((r) => pathname.startsWith(r)))}>
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">Cài đặt</span>
              </Link>
            )}
            {role && (
              <button
                onClick={handleLogout}
                className="ml-1 flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:border-red-200 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Đăng xuất</span>
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
