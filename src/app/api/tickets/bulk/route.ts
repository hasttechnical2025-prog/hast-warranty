import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { removeVietnameseTones } from "@/lib/tiengViet";
import { sendTelegramMessage } from "@/lib/telegram";
import { requireRole } from "@/lib/session";

function genCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let r = "";
  for (let i = 0; i < 12; i++) r += chars.charAt(Math.floor(Math.random() * chars.length));
  return r;
}

// Tạo NHIỀU phiếu 1 lần cho 1 khách (dự án nhiều máy).
// body: { shared: {ten_khach_hang, dia_chi, ngay_mua?, dia_diem_bao_hanh?, khach_hang_id?}, machines: [{model_name, serial?, so_ban_chup?, so_thang?}] }
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole("guest", "manager", "admin");
    if (!session) return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 });

    const body = await request.json();
    const shared = body?.shared || {};
    const machines: any[] = Array.isArray(body?.machines) ? body.machines : [];

    const ten_khach_hang = String(shared.ten_khach_hang || "").trim();
    const dia_chi = String(shared.dia_chi || "").trim();
    const dia_diem_bao_hanh = String(shared.dia_diem_bao_hanh || "Tại khách hàng").trim();
    const ngay_mua = shared.ngay_mua || null;

    if (!ten_khach_hang || !dia_chi) {
      return NextResponse.json({ error: "Thiếu Khách hàng hoặc Địa chỉ" }, { status: 400 });
    }
    if (machines.length === 0) {
      return NextResponse.json({ error: "Chưa có máy nào để tạo phiếu" }, { status: 400 });
    }

    // 1) Khách hàng: tái dùng theo tên chuẩn hoá, cập nhật địa chỉ (như tạo phiếu lẻ)
    let finalCustomerId = shared.khach_hang_id || null;
    const normalizedName = removeVietnameseTones(ten_khach_hang);
    if (finalCustomerId) {
      await supabaseAdmin.from("pbh_khach_hang").update({ dia_chi }).eq("id", finalCustomerId);
    } else {
      const { data: existing } = await supabaseAdmin
        .from("pbh_khach_hang")
        .select("id")
        .eq("ten_chuan_hoa", normalizedName)
        .limit(1);
      if (existing && existing.length > 0) {
        finalCustomerId = existing[0].id;
        await supabaseAdmin.from("pbh_khach_hang").update({ dia_chi }).eq("id", finalCustomerId);
      } else {
        const { data: newCust } = await supabaseAdmin
          .from("pbh_khach_hang")
          .insert({ ten_khach_hang, ten_chuan_hoa: normalizedName, dia_chi })
          .select("id")
          .single();
        if (newCust) finalCustomerId = newCust.id;
      }
    }

    // 2) Nạp toàn bộ model để khớp (model lạ -> bỏ qua + báo)
    const { data: allModels } = await supabaseAdmin.from("pbh_models").select("*");
    const modelMap = new Map((allModels || []).map((m: any) => [m.model_name.toLowerCase(), m]));

    const trang_thai = session.role === "guest" ? "cho_duyet" : "cho_in";
    const rows: any[] = [];
    const skipped: string[] = [];

    for (const mc of machines) {
      const name = String(mc?.model_name || "").trim();
      if (!name) continue;
      const model = modelMap.get(name.toLowerCase());
      if (!model) {
        skipped.push(name);
        continue;
      }
      const serial = mc.serial ? String(mc.serial).replace(/[^a-zA-Z0-9]/g, "").toUpperCase() : null;
      const sbcRaw = mc.so_ban_chup;
      const stRaw = mc.so_thang;
      const so_ban_chup =
        sbcRaw === "" || sbcRaw == null
          ? model.so_ban_chup_mac_dinh
          : Number(sbcRaw) > 0
          ? Math.floor(Number(sbcRaw))
          : 0;
      const so_thang =
        stRaw === "" || stRaw == null ? model.so_thang_mac_dinh : Number(stRaw) > 0 ? Math.floor(Number(stRaw)) : 0;

      const row: any = {
        khach_hang_id: finalCustomerId || null,
        ten_khach_hang,
        dia_chi,
        model_name: model.model_name,
        loai_san_pham: model.loai_san_pham,
        hang_sx: model.hang_sx,
        cau_hinh: model.cau_hinh,
        serial,
        so_ban_chup,
        so_thang,
        dia_diem_bao_hanh,
        nguoi_dang_ky: session.full_name,
        ma_tra_cuu: genCode(),
        trang_thai,
      };
      if (ngay_mua) row.ngay_mua = ngay_mua;
      rows.push(row);
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { created: [], skipped, error: "Không có máy hợp lệ. Các model lạ cần được thêm vào hệ thống trước." },
        { status: 400 }
      );
    }

    // 3) Chèn N phiếu (phòng thủ nếu cột nguoi_dang_ky chưa migrate)
    let { data: created, error } = await supabaseAdmin
      .from("pbh_phieu_bao_hanh")
      .insert(rows)
      .select("id, so_phieu");
    if (error && /nguoi_dang_ky/.test(error.message || "")) {
      const noCol = rows.map(({ nguoi_dang_ky, ...r }) => r);
      ({ data: created, error } = await supabaseAdmin.from("pbh_phieu_bao_hanh").insert(noCol).select("id, so_phieu"));
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // 4) Telegram tóm tắt
    const n = created?.length || 0;
    const choDuyet = trang_thai === "cho_duyet";
    await sendTelegramMessage(
      `${choDuyet ? "🕵️ <b>LÔ YÊU CẦU CẤP PHIẾU — CHỜ DUYỆT</b>" : "📝 <b>LÔ PHIẾU BẢO HÀNH MỚI (chờ in)</b>"}\n` +
        `-----------------------------------------\n` +
        `• <b>Khách hàng:</b> ${ten_khach_hang}\n` +
        `• <b>Người đăng ký:</b> ${session.full_name}\n` +
        `• <b>Số lượng:</b> ${n} phiếu${skipped.length ? ` (bỏ qua ${skipped.length} máy model lạ)` : ""}\n\n` +
        `${choDuyet ? "⏳ <i>Cần duyệt trước khi in.</i>" : "🔗 <i>Vào Duyệt &amp; In để in hàng loạt.</i>"}`
    );

    return NextResponse.json({ created: created || [], skipped });
  } catch (err: any) {
    console.error("Bulk create error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
