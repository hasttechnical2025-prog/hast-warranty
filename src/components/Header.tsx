"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Award, ShieldAlert, List, Settings, LogOut, Crop } from "lucide-react";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/admin/me");
      const data = await res.json();
      setIsAdmin(!!data.isAdmin);
    } catch (e) {
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, [pathname]);

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/admin/logout", { method: "POST" });
      if (res.ok) {
        setIsAdmin(false);
        router.push("/admin/login");
      }
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const isHome = pathname === "/";
  const isDuyetIn = pathname === "/admin" || pathname.startsWith("/admin/print");
  const isCauHinh = pathname === "/admin/models";
  const isCanPhoi = pathname === "/admin/can-phoi";

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-600 p-2 rounded-lg text-white">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-slate-800 text-lg tracking-tight">HSTC Warranty</span>
              <span className="text-xs text-emerald-600 font-semibold block -mt-1">Hệ thống Bảo hành</span>
            </div>
          </div>

          <nav className="flex items-center gap-1 sm:gap-3">
            <Link
              href="/"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isHome
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <ShieldAlert className="h-4 w-4" />
              <span>Đăng ký bảo hành</span>
            </Link>

            {isAdmin && (
              <>
                <Link
                  href="/admin"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isDuyetIn
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <List className="h-4 w-4" />
                  <span>Duyệt & In phiếu</span>
                </Link>

                <Link
                  href="/admin/models"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isCauHinh
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Settings className="h-4 w-4" />
                  <span>Cấu hình model</span>
                </Link>

                <Link
                  href="/admin/can-phoi"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isCanPhoi
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Crop className="h-4 w-4" />
                  <span>Căn phôi</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Đăng xuất</span>
                </button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
