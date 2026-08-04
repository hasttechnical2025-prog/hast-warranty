import React from "react";
import { notFound } from "next/navigation";
import { ShieldCheck, ShieldAlert, Calendar, Hash, FileText, CheckCircle2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";
import { mergeSettings, DEFAULT_SETTINGS } from "@/lib/settings";

interface PublicTicket {
  so_phieu: number;
  ten_khach_hang: string;
  model_name: string;
  hang_sx: string;
  serial: string | null;
  so_ban_chup: number;
  so_thang: number;
  ngay_mua: string;
  dia_diem_bao_hanh: string;
  cau_hinh: string;
}

export default async function LookupWarrantyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  // 1. Kiểm tra cấu hình xem có cho phép tra cứu không
  let settings = DEFAULT_SETTINGS;
  try {
    const { data: settingsData } = await supabaseAdmin
      .from("pbh_app_settings")
      .select("data")
      .eq("id", 1)
      .single();

    if (settingsData?.data) {
      settings = mergeSettings(settingsData.data);
    }
  } catch (err) {
    // Bỏ qua lỗi kết nối DB, dùng mặc định
  }

  // Yêu cầu: Nếu tắt chức năng tra cứu -> Trả về lỗi sập trang web thực sự (HTTP 404)
  if (!settings.enable_lookup) {
    notFound();
  }

  // 2. Tra cứu thông tin phiếu trực tiếp trên Server
  const { data: ticket, error } = await supabaseAdmin
    .from("pbh_phieu_bao_hanh")
    .select("so_phieu, ten_khach_hang, model_name, hang_sx, serial, so_ban_chup, so_thang, ngay_mua, dia_diem_bao_hanh, cau_hinh")
    .eq("ma_tra_cuu", code)
    .single() as { data: PublicTicket | null, error: any };

  if (error || !ticket) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 gap-4 text-center">
        <div className="bg-red-100 p-4 rounded-full text-red-600">
          <ShieldAlert className="h-16 w-16" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Không tìm thấy kết quả</h2>
          <p className="text-slate-500 mt-1 max-w-sm">Mã tra cứu không hợp lệ hoặc đã hết hạn trên hệ thống.</p>
        </div>
        <Link href="/" className="px-4 py-2 bg-brand-600 text-white rounded font-semibold text-sm hover:bg-brand-700 transition">
          Trở về Trang chủ
        </Link>
      </div>
    );
  }

  // 3. Tính toán ngày tháng và trạng thái hết hạn
  const ngayMuaDate = new Date(ticket.ngay_mua);
  const expDate = new Date(ngayMuaDate);
  expDate.setMonth(expDate.getMonth() + ticket.so_thang);

  const today = new Date();
  const isExpired = today > expDate;

  const formatDate = (date: Date) => {
    return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
  };

  const maskCustomerName = (name: string) => {
    if (name.length <= 15) return name;
    return name.slice(0, 15) + "...";
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 w-full flex-1 flex flex-col justify-center">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Banner */}
        <div className={`p-6 text-white text-center flex flex-col items-center gap-2 ${isExpired ? "bg-red-600" : "bg-brand-600"}`}>
          {isExpired ? (
            <>
              <AlertTriangle className="h-12 w-12" />
              <h1 className="text-xl font-bold tracking-tight">HẾT HẠN BẢO HÀNH</h1>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-12 w-12" />
              <h1 className="text-xl font-bold tracking-tight">MÁY TRONG THỜI HẠN BẢO HÀNH</h1>
            </>
          )}
          <p className="text-xs opacity-90">Hệ thống Tra cứu Bảo hành Siêu Thanh Hà Nội (HSTC)</p>
        </div>

        {/* Details List */}
        <div className="p-6 space-y-5 text-sm text-slate-600">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <span className="font-medium text-slate-500">Số phiếu bảo hành:</span>
            <span className="font-bold text-slate-900">#{ticket.so_phieu}</span>
          </div>

          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <span className="font-medium text-slate-500">Khách hàng:</span>
            <span className="font-semibold text-slate-900">{maskCustomerName(ticket.ten_khach_hang)}</span>
          </div>

          <div className="space-y-2 pb-3 border-b border-slate-100">
            <span className="font-medium text-slate-500 block">Sản phẩm & Model:</span>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex justify-between items-center">
              <div>
                <span className="font-bold text-slate-900 block">{ticket.model_name}</span>
                <span className="text-xs text-slate-500">{ticket.hang_sx} - {ticket.cau_hinh}</span>
              </div>
              <div className="flex items-center gap-1 text-slate-500 bg-white px-2 py-1 rounded border border-slate-200 text-xs font-mono">
                <Hash className="h-3 w-3" />
                {ticket.serial || "Không Serial"}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <span className="font-medium text-slate-500 flex items-center gap-1">
              <Calendar className="h-4 w-4 text-slate-400" />
              Ngày kích hoạt (Mua):
            </span>
            <span className="font-semibold text-slate-900">{formatDate(ngayMuaDate)}</span>
          </div>

          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <span className="font-medium text-slate-500 flex items-center gap-1">
              <Calendar className="h-4 w-4 text-slate-400" />
              Ngày hết hạn bảo hành:
            </span>
            <span className={`font-semibold ${isExpired ? "text-red-600 font-bold" : "text-brand-600 font-bold"}`}>
              {formatDate(expDate)}
            </span>
          </div>

          <div className="space-y-1">
            <span className="font-medium text-slate-500 flex items-center gap-1">
              <FileText className="h-4 w-4 text-slate-400" />
              Điều kiện bảo hành đi kèm:
            </span>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs leading-relaxed text-slate-600">
              Bảo hành <strong>{ticket.so_ban_chup.toLocaleString("vi-VN")}</strong> bản chụp/in hoặc <strong>{ticket.so_thang}</strong> tháng tùy điều kiện nào đến trước.
              <br />
              Địa điểm bảo hành: <strong>{ticket.dia_diem_bao_hanh}</strong>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
