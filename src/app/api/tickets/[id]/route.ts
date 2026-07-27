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

    // Get current ticket (kiểm tra tồn tại + để thông báo Telegram)
    const { data: ticket, error: getErr } = await supabaseAdmin
      .from('pbh_phieu_bao_hanh')
      .select('so_phieu, ten_khach_hang, model_name')
      .eq('id', id)
      .single();

    if (getErr || !ticket) {
      return NextResponse.json({ error: "Không tìm thấy phiếu" }, { status: 404 });
    }

    // Gom các trường được phép cập nhật (chỉ lấy trường CÓ trong body).
    const update: Record<string, any> = {};

    const textFields = [
      'ten_khach_hang', 'dia_chi', 'model_name',
      'loai_san_pham', 'hang_sx', 'cau_hinh', 'dia_diem_bao_hanh', 'ngay_mua',
    ] as const;
    for (const k of textFields) {
      if (body[k] !== undefined && body[k] !== null) {
        update[k] = typeof body[k] === 'string' ? body[k].trim() : body[k];
      }
    }

    if (body.serial !== undefined) {
      update.serial = body.serial ? String(body.serial).replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : null;
    }
    if (body.so_ban_chup !== undefined && body.so_ban_chup !== '') update.so_ban_chup = Number(body.so_ban_chup);
    if (body.so_thang !== undefined && body.so_thang !== '') update.so_thang = Number(body.so_thang);

    // Trạng thái (tùy chọn); nếu có phải hợp lệ.
    const trang_thai = body.trang_thai;
    if (trang_thai !== undefined) {
      if (!['cho_in', 'da_in', 'huy'].includes(trang_thai)) {
        return NextResponse.json({ error: "Trạng thái không hợp lệ" }, { status: 400 });
      }
      update.trang_thai = trang_thai;
    }

    // Chặn cập nhật rỗng các trường bắt buộc
    for (const req of ['ten_khach_hang', 'dia_chi', 'model_name'] as const) {
      if (req in update && !update[req]) {
        return NextResponse.json({ error: "Thiếu thông tin bắt buộc (Khách hàng, Địa chỉ, Model)" }, { status: 400 });
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Không có gì để cập nhật" }, { status: 400 });
    }

    const { error: updateErr } = await supabaseAdmin
      .from('pbh_phieu_bao_hanh')
      .update(update)
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
