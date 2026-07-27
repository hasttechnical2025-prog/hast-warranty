import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
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
