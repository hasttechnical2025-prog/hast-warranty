"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Key, User } from "lucide-react";

function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const linkError = searchParams.get("e") === "link";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMsg("Vui lòng nhập mật khẩu.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Đăng nhập thất bại.");
      // Điều hướng theo vai trò
      router.push(data.role === "guest" ? "/" : "/admin");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="p-6 space-y-4">
      {linkError && (
        <div className="p-3 bg-amber-50 border-l-4 border-amber-500 text-amber-700 rounded text-xs">
          Link cá nhân không hợp lệ hoặc đã bị thu hồi. Vui lòng đăng nhập hoặc liên hệ admin.
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded text-xs">{errorMsg}</div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
          <User className="h-4 w-4 text-slate-400" />
          Tên đăng nhập
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Tên đăng nhập..."
          className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
          <Key className="h-4 w-4 text-slate-400" />
          Mật khẩu
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Nhập mật khẩu..."
          className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-brand-600 text-white font-bold rounded-lg hover:bg-brand-700 active:bg-brand-800 transition disabled:bg-slate-300 shadow-sm"
      >
        {loading ? "Đang xác thực..." : "ĐĂNG NHẬP"}
      </button>

      <p className="text-center text-[11px] text-slate-400">
        Nhân viên đăng ký phiếu dùng <b>link cá nhân</b> do admin cấp.
      </p>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-slate-100">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
        <div className="bg-brand-600 p-6 text-white text-center flex flex-col items-center gap-2">
          <div className="bg-white/10 p-3 rounded-full">
            <Lock className="h-8 w-8" />
          </div>
          <h1 className="font-bold text-lg">ĐĂNG NHẬP HỆ THỐNG</h1>
          <p className="text-xs text-brand-100">Dành cho Manager / Admin</p>
        </div>

        <Suspense fallback={<div className="p-6 text-center text-slate-500 text-sm">Đang tải...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
