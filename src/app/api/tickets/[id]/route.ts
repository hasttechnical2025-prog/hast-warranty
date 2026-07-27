import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendTelegramMessage } from '@/lib/telegram';
import { isAdminAuthenticated } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { trang_thai } = body;

    if (!trang_thai || !['cho_in', 'da_in', 'huy'].includes(trang_thai)) {
      return NextResponse.json({ error: "Trạng thái không hợp lệ" }, { status: 400 });
    }

    // Get current ticket to know who to notify
    const { data: ticket, error: getErr } = await supabaseAdmin
      .from('pbh_phieu_bao_hanh')
      .select('so_phieu, ten_khach_hang, model_name')
      .eq('id', id)
      .single();

    if (getErr || !ticket) {
      return NextResponse.json({ error: "Không tìm thấy phiếu" }, { status: 404 });
    }

    const { error: updateErr } = await supabaseAdmin
      .from('pbh_phieu_bao_hanh')
      .update({ trang_thai })
      .eq('id', id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Notify if status changed to da_in
    if (trang_thai === 'da_in') {
       const tgMessage = `✅ <b>ĐÃ IN PHIẾU BẢO HÀNH</b>\n` +
      `-----------------------------------------\n` +
      `• <b>Số phiếu:</b> #${ticket.so_phieu}\n` +
      `• <b>Khách hàng:</b> ${ticket.ten_khach_hang}\n` +
      `• <b>Model:</b> ${ticket.model_name}\n\n` +
      `<i>Phiếu đã được in, ký và đóng dấu. Vui lòng qua nhận!</i>`;

       await sendTelegramMessage(tgMessage);
    }

    return NextResponse.json({ success: true, trang_thai });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Bản ghi đầy đủ (địa chỉ, mã tra cứu...) → chỉ admin. Khách tra cứu qua /api/lookup.
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { data: ticket, error } = await supabaseAdmin
      .from('pbh_phieu_bao_hanh')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !ticket) {
      return NextResponse.json({ error: error?.message || 'Not found' }, { status: 404 });
    }
    return NextResponse.json(ticket);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
