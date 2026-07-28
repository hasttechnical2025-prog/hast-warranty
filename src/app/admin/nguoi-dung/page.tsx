"use client";

import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { UserPlus, Trash2, Edit2, X, Copy, QrCode, RefreshCw, ShieldCheck, Power } from "lucide-react";
import { AdminSettingsTabs } from "@/components/AdminSettingsTabs";

interface User {
  id: number;
  username: string | null;
  full_name: string;
  role: "guest" | "manager" | "admin";
  is_active: boolean;
  login_token: string | null;
  created_at: string;
}

const ROLE_LABEL: Record<string, string> = { guest: "Guest (đăng ký)", manager: "Manager", admin: "Admin" };

export default function NguoiDungPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"guest" | "manager" | "admin">("guest");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const [linkUser, setLinkUser] = useState<User | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    load();
  }, []);

  function load() {
    setLoading(true);
    fetch("/api/users")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setUsers(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  function clearForm() {
    setEditingId(null);
    setFullName("");
    setRole("guest");
    setUsername("");
    setPassword("");
    setIsActive(true);
  }

  function editUser(u: User) {
    setEditingId(u.id);
    setFullName(u.full_name);
    setRole(u.role);
    setUsername(u.username || "");
    setPassword("");
    setIsActive(u.is_active);
  }

  async function save() {
    setErr("");
    setMsg("");
    if (!fullName.trim()) return setErr("Vui lòng nhập họ tên.");
    if (role !== "guest" && !username.trim()) return setErr("Vai trò này cần tên đăng nhập.");
    if (role !== "guest" && !editingId && !password) return setErr("Vai trò này cần mật khẩu.");
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          full_name: fullName,
          role,
          username: role === "guest" ? null : username,
          password: password || undefined,
          is_active: isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lưu thất bại");
      setMsg(editingId ? "Đã cập nhật người dùng." : "Đã tạo người dùng.");
      clearForm();
      load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(u: User) {
    await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: u.id, full_name: u.full_name, role: u.role, username: u.username, is_active: !u.is_active }),
    });
    load();
  }

  async function regenToken(u: User) {
    if (!window.confirm("Tạo link mới sẽ vô hiệu link cũ của người này. Tiếp tục?")) return;
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: u.id, full_name: u.full_name, role: u.role, regen_token: true }),
    });
    const data = await res.json();
    load();
    if (data && data.login_token) setLinkUser({ ...u, login_token: data.login_token });
  }

  async function removeUser(u: User) {
    if (!window.confirm(`Xoá người dùng "${u.full_name}"?`)) return;
    const res = await fetch(`/api/users?id=${u.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setErr(data.error || "Xoá thất bại");
      return;
    }
    load();
  }

  const inputCls =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";
  const guestLink = (u: User | null) => (u?.login_token ? `${origin}/vao/${u.login_token}` : "");

  return (
    <div className="flex-1 flex flex-col">
      <AdminSettingsTabs />
      <div className="max-w-7xl mx-auto px-4 py-8 w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Form */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-emerald-600 px-6 py-4 text-white flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            <h2 className="font-bold text-base">{editingId ? "CẬP NHẬT NGƯỜI DÙNG" : "THÊM NGƯỜI DÙNG"}</h2>
          </div>
          <div className="p-6 space-y-4">
            {err && <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded text-xs">{err}</div>}
            {msg && (
              <div className="p-3 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 rounded text-xs flex items-center gap-1">
                <ShieldCheck className="h-4 w-4" />
                {msg}
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Họ tên *</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} placeholder="Nguyễn Văn A" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Vai trò *</label>
              <select value={role} onChange={(e) => setRole(e.target.value as any)} className={inputCls}>
                <option value="guest">Guest — chỉ đăng ký phiếu (đăng nhập bằng link)</option>
                <option value="manager">Manager — đăng ký + Duyệt &amp; In</option>
                <option value="admin">Admin — toàn quyền</option>
              </select>
            </div>

            {role !== "guest" && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Tên đăng nhập *</label>
                  <input value={username} onChange={(e) => setUsername(e.target.value)} className={inputCls} placeholder="vd: manager1" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Mật khẩu {editingId ? "(để trống nếu giữ nguyên)" : "*"}
                  </label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
                </div>
              </>
            )}
            {role === "guest" && (
              <p className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-500">
                Guest không cần mật khẩu — sau khi tạo sẽ có <b>link/QR cá nhân</b> để đăng nhập.
              </p>
            )}

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4" />
              Đang hoạt động
            </label>

            <div className="flex gap-2 pt-2">
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition text-sm shadow-sm disabled:bg-slate-300"
              >
                {saving ? "Đang lưu..." : editingId ? "CẬP NHẬT" : "THÊM MỚI"}
              </button>
              {editingId && (
                <button onClick={clearForm} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm">
                  HỦY
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="lg:col-span-2 flex flex-col">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-slate-700">
            Người dùng ({users.length})
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Họ tên</th>
                  <th className="px-5 py-3">Vai trò</th>
                  <th className="px-5 py-3">Đăng nhập</th>
                  <th className="px-5 py-3">Trạng thái</th>
                  <th className="px-5 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-500">Đang tải...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-500">Chưa có người dùng. Tài khoản admin sẽ tự tạo khi bạn đăng nhập bằng mật khẩu quản trị.</td></tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-semibold text-slate-900">{u.full_name}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                          u.role === "admin" ? "bg-purple-100 text-purple-700" : u.role === "manager" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                        }`}>{ROLE_LABEL[u.role]}</span>
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {u.role === "guest" ? (
                          <button onClick={() => setLinkUser(u)} className="inline-flex items-center gap-1 text-emerald-600 hover:underline">
                            <QrCode className="h-3.5 w-3.5" /> Link/QR
                          </button>
                        ) : (
                          u.username || "—"
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {u.is_active ? (
                          <span className="text-emerald-600 text-xs font-medium">Hoạt động</span>
                        ) : (
                          <span className="text-slate-400 text-xs font-medium">Đã khoá</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button onClick={() => toggleActive(u)} title={u.is_active ? "Khoá" : "Mở khoá"} className="p-1.5 bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-600 rounded">
                            <Power className="h-4 w-4" />
                          </button>
                          <button onClick={() => editUser(u)} title="Sửa" className="p-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => removeUser(u)} title="Xoá" className="p-1.5 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal link/QR guest */}
      {linkUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 bg-emerald-600 px-5 py-3 text-white">
              <h3 className="font-bold">Link đăng nhập — {linkUser.full_name}</h3>
              <button onClick={() => setLinkUser(null)} className="rounded-md p-1 hover:bg-white/15"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 flex flex-col items-center gap-4">
              <div className="rounded-xl border border-slate-200 p-3 bg-white">
                <QRCodeSVG value={guestLink(linkUser)} size={180} level="M" />
              </div>
              <div className="w-full">
                <div className="flex items-center gap-2">
                  <input readOnly value={guestLink(linkUser)} className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs" />
                  <button
                    onClick={() => navigator.clipboard?.writeText(guestLink(linkUser))}
                    className="rounded-lg bg-slate-100 px-3 py-2 text-slate-600 hover:bg-slate-200"
                    title="Sao chép"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-slate-400">
                  Gửi link/QR này cho nhân viên. Mở link 1 lần là đăng nhập lâu dài trên thiết bị đó.
                </p>
              </div>
              <button
                onClick={() => regenToken(linkUser)}
                className="inline-flex items-center gap-2 text-sm font-medium text-amber-600 hover:underline"
              >
                <RefreshCw className="h-4 w-4" /> Tạo link mới (thu hồi link cũ)
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
