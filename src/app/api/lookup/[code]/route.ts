import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { mergeSettings, DEFAULT_SETTINGS } from '@/lib/settings';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    // 1. Kiểm tra cấu hình hệ thống xem có cho phép tra cứu không
    let settings = DEFAULT_SETTINGS;
    try {
      const { data: settingsData, error: settingsError } = await supabaseAdmin
        .from('pbh_app_settings')
        .select('data')
        .eq('id', 1)
        .single();

      if (!settingsError && settingsData?.data) {
        settings = mergeSettings(settingsData.data);
      }
    } catch (settingsErr) {
      // Bỏ qua lỗi kết nối setting, dùng mặc định (true)
    }

    if (!settings.enable_lookup) {
      return NextResponse.json({ error: "Tính năng tra cứu bảo hành qua mã QR tạm khóa." }, { status: 404 });
    }

    const { code } = await params;
    const { data: ticket, error } = await supabaseAdmin
      .from('pbh_phieu_bao_hanh')
      .select('so_phieu, ten_khach_hang, model_name, hang_sx, serial, so_ban_chup, so_thang, ngay_mua, dia_diem_bao_hanh, cau_hinh')
      .eq('ma_tra_cuu', code)
      .single();

    if (error || !ticket) {
      return NextResponse.json({ error: "Không tìm thấy thông tin bảo hành." }, { status: 404 });
    }

    return NextResponse.json(ticket);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
