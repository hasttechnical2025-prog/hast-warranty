"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SlidersHorizontal, Cpu, Crop, Users } from "lucide-react";

// Thanh tab con cho khu "Cài đặt" (admin). Hiển thị ở đầu các trang cấu hình.
const TABS = [
  { href: "/admin/cai-dat", label: "Hệ thống", icon: SlidersHorizontal },
  { href: "/admin/models", label: "Model máy", icon: Cpu },
  { href: "/admin/can-phoi", label: "Căn phôi", icon: Crop },
  { href: "/admin/nguoi-dung", label: "Người dùng", icon: Users },
];

export function AdminSettingsTabs() {
  const pathname = usePathname();
  return (
    <div className="border-b border-slate-200 bg-white no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  active
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
