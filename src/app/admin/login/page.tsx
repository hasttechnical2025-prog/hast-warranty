"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Key } from "lucide-react";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Đăng nhập thất bại.");
      }

      router.push("/admin");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-slate-100">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
        <div className="bg-emerald-600 p-6 text-white text-center flex flex-col items-center gap-2">
          <div className="bg-white/10 p-3 rounded-full">
            <Lock className="h-8 w-8" />
          </div>
          <h1 className="font-bold text-lg">ĐĂNG NHẬP HỆ THỐNG</h1>
          <p className="text-xs text-emerald-100">Chỉ dành cho Admin / Quản trị viên</p>
        </div>

        <form onSubmit={handleLogin} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded text-xs">
              {errorMsg}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
              <Key className="h-4 w-4 text-slate-400" />
              Mật khẩu Admin
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu..."
              className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 active:bg-emerald-800 transition disabled:bg-slate-300 shadow-sm"
          >
            {loading ? "Đang xác thực..." : "ĐĂNG NHẬP"}
          </button>
        </form>
      </div>
    </div>
  );
}
