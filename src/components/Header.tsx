"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Award, ShieldAlert, List, LogOut, SlidersHorizontal } from "lucide-react";
import { DEFAULT_SETTINGS, type AppSettings } from "@/lib/settings";

type Role = "guest" | "manager" | "admin" | null;

// Các route thuộc khu "Cài đặt" (tab con nằm trong AdminSettingsTabs)
const SETTINGS_ROUTES = ["/admin/cai-dat", "/admin/models", "/admin/can-phoi", "/admin/nguoi-dung"];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<Role>(null);
  const [fullName, setFullName] = useState<string>("");
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d && !d.error) setSettings(d);
      })
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => r.json())
      .then((d) => {
        setRole(d.authenticated ? d.role : null);
        setFullName(d.full_name || "");
      })
      .catch(() => setRole(null));
  }, [pathname]);

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/admin/logout", { method: "POST" });
      if (res.ok) {
        setRole(null);
        router.push("/admin/login");
      }
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const isManagerUp = role === "manager" || role === "admin";
  const isAdmin = role === "admin";

  const navCls = (active: boolean) =>
    `flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      active ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
    }`;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            {settings.logo_data_url ? (
              <img src={settings.logo_data_url} alt="logo" className="h-9 w-9 rounded-lg object-contain" />
            ) : (
              <div className="bg-emerald-600 p-2 rounded-lg text-white">
                <Award className="h-5 w-5" />
              </div>
            )}
            <div>
              <span className="font-bold text-slate-800 text-lg tracking-tight">{settings.system_name}</span>
              <span className="text-xs text-emerald-600 font-semibold block -mt-1">{settings.system_subtitle}</span>
            </div>
          </div>

          <nav className="flex items-center gap-1 sm:gap-2">
            {role && (
              <Link href="/" className={navCls(pathname === "/")}>
                <ShieldAlert className="h-4 w-4" />
                <span className="hidden sm:inline">Đăng ký</span>
              </Link>
            )}

            {isManagerUp && (
              <Link
                href="/admin"
                className={navCls(pathname === "/admin" || pathname.startsWith("/admin/print"))}
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Duyệt &amp; In</span>
              </Link>
            )}

            {isAdmin && (
              <Link href="/admin/cai-dat" className={navCls(SETTINGS_ROUTES.some((r) => pathname.startsWith(r)))}>
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">Cài đặt</span>
              </Link>
            )}

            {role && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                title={fullName ? `Đăng xuất (${fullName})` : "Đăng xuất"}
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
