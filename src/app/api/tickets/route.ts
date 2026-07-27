import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { removeVietnameseTones } from '@/lib/tiengViet';
import { sendTelegramMessage } from '@/lib/telegram';
import { isAdminAuthenticated } from '@/lib/auth';

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
    // Danh sách phiếu chứa thông tin khách hàng → chỉ admin được liệt kê.
    if (!(await isAdminAuthenticated())) {
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
      khach_hang_id, // can be passed if selected from lookup
    } = body;

    if (!ten_khach_hang || !dia_chi || !model_name) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc (Khách hàng, Địa chỉ, Model)" }, { status: 400 });
    }

    // Clean serial: keep only uppercase alpha-numeric characters (or leave empty)
    const cleanedSerial = serial ? serial.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : null;

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

    // 2. Generate random lookup code
    const lookupCode = generateSearchCode();

    // 3. Create Ticket
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
      ma_tra_cuu: lookupCode,
      trang_thai: 'cho_in'
    };

    if (ngay_mua) {
      ticketData.ngay_mua = ngay_mua;
    }

    const { data: newTicket, error: ticketErr } = await supabaseAdmin
      .from('pbh_phieu_bao_hanh')
      .insert(ticketData)
      .select('id, so_phieu')
      .single();

    if (ticketErr) {
      console.error("Error creating ticket:", ticketErr);
      return NextResponse.json({ error: ticketErr.message }, { status: 500 });
    }

    // 4. Send Telegram Notification
    const tgMessage = `📝 <b>YÊU CẦU CẤP PHIẾU BẢO HÀNH MỚI</b>\n` +
      `-----------------------------------------\n` +
      `• <b>Số phiếu:</b> #${newTicket.so_phieu}\n` +
      `• <b>Khách hàng:</b> ${ten_khach_hang.trim()}\n` +
      `• <b>Địa chỉ:</b> ${dia_chi.trim()}\n` +
      `• <b>Model:</b> ${model_name} ${cleanedSerial ? `(S/N: ${cleanedSerial})` : '(Chưa có Serial)'}\n` +
      `• <b>Bảo hành:</b> ${Number(so_ban_chup).toLocaleString('vi-VN')} bản / ${so_thang} tháng\n` +
      `• <b>Địa điểm:</b> ${dia_diem_bao_hanh}\n\n` +
      `🔗 <i>Xem và in phiếu tại dashboard admin</i>`;

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
