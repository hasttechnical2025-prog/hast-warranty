import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { removeVietnameseTones } from '@/lib/tiengViet';
import { sendTelegramMessage } from '@/lib/telegram';
import { requireRole } from '@/lib/session';

// Helper to generate a random search code for QR
function generateSearchCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function GET(request: NextRequest) {
  try {
    // Danh sách phiếu → manager/admin.
    if (!(await requireRole("manager", "admin"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status'); // 'cho_in' | 'da_in' | 'huy'
    const query = searchParams.get('q'); // Search by serial or customer name

    let dbQuery = supabaseAdmin
      .from('pbh_phieu_bao_hanh')
      .select('*');

    if (status) {
      dbQuery = dbQuery.eq('trang_thai', status);
    }

    if (query) {
      // Loại các ký tự có ý nghĩa trong bộ lọc PostgREST (.or) và ký tự đại diện
      // ilike để tránh chèn thêm điều kiện lọc. Giới hạn độ dài cho an toàn.
      const safe = query.trim().slice(0, 100).replace(/[,()%*\\]/g, '');
      if (safe) {
        dbQuery = dbQuery.or(`serial.ilike.%${safe}%,ten_khach_hang.ilike.%${safe}%`);
      }
    }

    // Return newest first
    const { data, error } = await dbQuery.order('so_phieu', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Đăng ký phiếu: phải đăng nhập (guest/manager/admin). Người đăng ký lấy từ phiên
    // (không tin giá trị client gửi lên) để đảm bảo truy vết đúng người.
    const session = await requireRole("guest", "manager", "admin");
    if (!session) {
      return NextResponse.json({ error: "Vui lòng đăng nhập để đăng ký phiếu" }, { status: 401 });
    }

    const body = await request.json();
    const {
      ngay_mua,
      ten_khach_hang,
      dia_chi,
      model_name,
      loai_san_pham,
      hang_sx,
      serial,
      cau_hinh,
      dia_diem_bao_hanh,
      so_ban_chup,
      so_thang,
      serials, // mảng serial khi phiếu áp cho NHIỀU máy cùng model
      khach_hang_id, // can be passed if selected from lookup
    } = body;

    // Người đăng ký = tên tài khoản đang đăng nhập (truy vết chính xác)
    const nguoi_dang_ky = session.full_name;

    if (!ten_khach_hang || !dia_chi || !model_name) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc (Khách hàng, Địa chỉ, Model)" }, { status: 400 });
    }

    // Danh sách serial (nhiều máy): làm sạch + loại trùng
    const cleanSerial = (s: any) => String(s || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const serialList: string[] = Array.isArray(serials)
      ? Array.from(new Set(serials.map(cleanSerial).filter(Boolean)))
      : [];
    const isMulti = serialList.length > 0;
    const so_may = isMulti ? serialList.length : 1;

    // Serial đơn (chỉ khi 1 máy). Nhiều máy -> để null, serial nằm ở bảng con.
    const cleanedSerial = isMulti ? null : serial ? cleanSerial(serial) : null;

    let finalCustomerId = khach_hang_id;
    const normalizedName = removeVietnameseTones(ten_khach_hang);

    // 1. Handle Customer Reference & Address update
    if (finalCustomerId) {
      // If customer selected, check and update address if it changed
      const { data: currentCust } = await supabaseAdmin
        .from('pbh_khach_hang')
        .select('dia_chi')
        .eq('id', finalCustomerId)
        .single();

      if (currentCust && currentCust.dia_chi !== dia_chi) {
        await supabaseAdmin
          .from('pbh_khach_hang')
          .update({ dia_chi: dia_chi })
          .eq('id', finalCustomerId);
      }
    } else {
      // Check if client with this name already exists (case insensitive match on normalized names)
      const { data: existingCusts } = await supabaseAdmin
        .from('pbh_khach_hang')
        .select('id, dia_chi')
        .eq('ten_chuan_hoa', normalizedName)
        .limit(1);

      if (existingCusts && existingCusts.length > 0) {
        finalCustomerId = existingCusts[0].id;
        // Ghi đè địa chỉ mới vào khách cũ
        if (existingCusts[0].dia_chi !== dia_chi) {
          await supabaseAdmin
            .from('pbh_khach_hang')
            .update({ dia_chi: dia_chi })
            .eq('id', finalCustomerId);
        }
      } else {
        // Create new customer
        const { data: newCust, error: custErr } = await supabaseAdmin
          .from('pbh_khach_hang')
          .insert({
            ten_khach_hang: ten_khach_hang.trim(),
            ten_chuan_hoa: normalizedName,
            dia_chi: dia_chi.trim()
          })
          .select('id')
          .single();

        if (!custErr && newCust) {
          finalCustomerId = newCust.id;
        }
      }
    }

    // 2. Tự thu nạp model nếu chưa có trong danh sách (không chặn nhân viên).
    //    Guest/manager tạo -> đánh dấu NHÁP để admin chuẩn hoá; admin tạo -> chuẩn luôn.
    try {
      const { data: existModel } = await supabaseAdmin
        .from('pbh_models')
        .select('id')
        .eq('model_name', String(model_name).trim())
        .maybeSingle();
      if (!existModel) {
        const modelRow: any = {
          model_name: String(model_name).trim(),
          hang_sx: String(hang_sx || '').trim() || 'Chưa rõ',
          loai_san_pham: String(loai_san_pham || '').trim() || 'Máy photocopy',
          cau_hinh: String(cau_hinh || '').trim() || 'Chưa rõ',
          so_ban_chup_mac_dinh: Number(so_ban_chup) > 0 ? Math.floor(Number(so_ban_chup)) : 0,
          so_thang_mac_dinh: Number(so_thang) > 0 ? Math.floor(Number(so_thang)) : 12,
          is_draft: session.role !== 'admin',
        };
        const { error: mErr } = await supabaseAdmin.from('pbh_models').insert(modelRow);
        if (mErr && /is_draft/.test(mErr.message || '')) {
          const { is_draft: _d, ...noDraft } = modelRow;
          await supabaseAdmin.from('pbh_models').insert(noDraft);
        }
      }
    } catch {
      /* không để việc thu nạp model làm hỏng tạo phiếu */
    }

    // 3. Generate random lookup code
    const lookupCode = generateSearchCode();

    // 4. Create Ticket
    const ticketData: any = {
      khach_hang_id: finalCustomerId || null,
      ten_khach_hang: ten_khach_hang.trim(),
      dia_chi: dia_chi.trim(),
      model_name,
      loai_san_pham,
      hang_sx,
      serial: cleanedSerial,
      cau_hinh,
      dia_diem_bao_hanh,
      so_ban_chup: Number(so_ban_chup),
      so_thang: Number(so_thang),
      so_may,
      nguoi_dang_ky: String(nguoi_dang_ky).trim(),
      ma_tra_cuu: lookupCode,
      // Guest đăng ký -> CHỜ DUYỆT; manager/admin tự tạo -> vào thẳng CHỜ IN
      trang_thai: session.role === 'guest' ? 'cho_duyet' : 'cho_in',
    };

    if (ngay_mua) {
      ticketData.ngay_mua = ngay_mua;
    }

    let { data: newTicket, error: ticketErr } = await supabaseAdmin
      .from('pbh_phieu_bao_hanh')
      .insert(ticketData)
      .select('id, so_phieu')
      .single();

    // Phòng thủ: cột chưa migrate (nguoi_dang_ky mig 003 / so_may mig 007) -> bỏ ĐÚNG
    // cột lỗi rồi thử lại (từng cột một, tránh mất nhầm cột khác).
    let attempt: any = ticketData;
    for (let i = 0; i < 3 && ticketErr; i++) {
      const m = ticketErr.message || "";
      if (/so_may/.test(m) && "so_may" in attempt) {
        const { so_may: _s, ...rest } = attempt;
        attempt = rest;
      } else if (/nguoi_dang_ky/.test(m) && "nguoi_dang_ky" in attempt) {
        const { nguoi_dang_ky: _n, ...rest } = attempt;
        attempt = rest;
      } else break;
      ({ data: newTicket, error: ticketErr } = await supabaseAdmin
        .from("pbh_phieu_bao_hanh")
        .insert(attempt)
        .select("id, so_phieu")
        .single());
    }

    if (ticketErr || !newTicket) {
      console.error("Error creating ticket:", ticketErr);
      return NextResponse.json({ error: ticketErr?.message || "Không tạo được phiếu" }, { status: 500 });
    }

    // Ghi danh sách serial (nhiều máy) vào bảng con
    if (isMulti) {
      try {
        await supabaseAdmin
          .from('pbh_phieu_serial')
          .insert(serialList.map((s) => ({ phieu_id: newTicket!.id, serial: s })));
      } catch {
        /* bảng chưa migrate -> bỏ qua, không hỏng việc tạo phiếu */
      }
    }

    // 4. Send Telegram Notification
    const choDuyet = ticketData.trang_thai === 'cho_duyet';
    const tgMessage = `${choDuyet ? '🕵️ <b>YÊU CẦU CẤP PHIẾU — CHỜ DUYỆT</b>' : '📝 <b>PHIẾU BẢO HÀNH MỚI (chờ in)</b>'}\n` +
      `-----------------------------------------\n` +
      `• <b>Số phiếu:</b> #${newTicket.so_phieu}\n` +
      `• <b>Người đăng ký:</b> ${String(nguoi_dang_ky).trim()}\n` +
      `• <b>Khách hàng:</b> ${ten_khach_hang.trim()}\n` +
      `• <b>Địa chỉ:</b> ${dia_chi.trim()}\n` +
      `• <b>Model:</b> ${model_name} ${cleanedSerial ? `(S/N: ${cleanedSerial})` : '(Chưa có Serial)'}\n` +
      `• <b>Bảo hành:</b> ${Number(so_ban_chup).toLocaleString('vi-VN')} bản / ${so_thang} tháng\n` +
      `• <b>Địa điểm:</b> ${dia_diem_bao_hanh}\n\n` +
      `${choDuyet ? '⏳ <i>Cần duyệt trong mục Duyệt &amp; In trước khi in.</i>' : '🔗 <i>Xem và in phiếu tại Duyệt &amp; In.</i>'}`;

    await sendTelegramMessage(tgMessage);

    return NextResponse.json({
      success: true,
      id: newTicket.id,
      so_phieu: newTicket.so_phieu,
      ma_tra_cuu: lookupCode
    });
  } catch (err: any) {
    console.error("Unexpected error creating ticket:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
