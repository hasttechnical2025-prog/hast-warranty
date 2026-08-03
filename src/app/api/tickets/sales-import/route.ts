import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireRole } from "@/lib/session";
import { removeVietnameseTones } from "@/lib/tiengViet";
import { sendTelegramMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";

function genCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let r = "";
  for (let i = 0; i < 12; i++) r += chars.charAt(Math.floor(Math.random() * chars.length));
  return r;
}

// API dành riêng cho Sales (guest) và Admin/Manager để import hàng loạt phiếu mới từ Excel
// Tự sinh số phiếu (sequence), trạng thái = cho_duyet (nếu là guest) hoặc cho_in (nếu là manager/admin).
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole("guest", "manager", "admin");
    if (!session) return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 });

    const body = await request.json();
    const rows: any[] = Array.isArray(body?.tickets) ? body.tickets : [];
    if (rows.length === 0) return NextResponse.json({ error: "Không có dòng nào để nhập" }, { status: 400 });

    const invalid: string[] = [];
    const clean: any[] = [];

    // Lấy danh sách model trong hệ thống để đối soát trước
    const { data: allModels } = await supabaseAdmin.from("pbh_models").select("*");
    const modelMap = new Map((allModels || []).map((m: any) => [m.model_name.toLowerCase(), m]));

    for (const r of rows) {
      const ten = String(r?.ten_khach_hang ?? "").trim();
      const modelName = String(r?.model_name ?? "").trim();

      // Bắt buộc phải có Tên khách hàng và Model máy
      if (!ten || !modelName) {
        invalid.push(ten || modelName || "(Dòng thiếu tên KH/Model)");
        continue;
      }

      const model = modelMap.get(modelName.toLowerCase());
      if (!model) {
        invalid.push(`${modelName} (Model chưa có trong hệ thống)`);
        continue;
      }

      const serial = r?.serial ? String(r.serial).replace(/[^a-zA-Z0-9]/g, "").toUpperCase() : null;
      const sbcRaw = r?.so_ban_chup;
      const stRaw = r?.so_thang;

      // Nếu số bản chụp hoặc số tháng trống, lấy giá trị mặc định của Model
      const so_ban_chup =
        sbcRaw === "" || sbcRaw == null
          ? model.so_ban_chup_mac_dinh
          : Number(sbcRaw) > 0
          ? Math.floor(Number(sbcRaw))
          : 0;

      const so_thang =
        stRaw === "" || stRaw == null
          ? model.so_thang_mac_dinh
          : Number(stRaw) > 0
          ? Math.floor(Number(stRaw))
          : 0;

      clean.push({
        ten,
        dia_chi: String(r?.dia_chi ?? "").trim(),
        model_name: model.model_name,
        loai_san_pham: model.loai_san_pham,
        hang_sx: model.hang_sx,
        cau_hinh: model.cau_hinh,
        serial,
        so_ban_chup,
        so_thang,
        dia_diem_bao_hanh: String(r?.dia_diem_bao_hanh ?? "").trim() || "Tại khách hàng",
        ngay_mua: /^\d{4}-\d{2}-\d{2}$/.test(String(r?.ngay_mua ?? "")) ? r.ngay_mua : null,
      });
    }

    if (clean.length === 0) {
      return NextResponse.json({ added: 0, invalid, error: "Không có dòng dữ liệu nào hợp lệ." }, { status: 400 });
    }

    // 1) Khách hàng: tìm/tạo theo tên chuẩn hoá (gộp 1 lượt cho nhanh)
    const nameNorm = new Map<string, string>();
    for (const c of clean) {
      if (!nameNorm.has(c.ten)) {
        nameNorm.set(c.ten, removeVietnameseTones(c.ten));
      }
    }
    const norms = Array.from(new Set(nameNorm.values()));
    const custByNorm = new Map<string, number>();

    const { data: existCusts } = await supabaseAdmin
      .from("pbh_khach_hang")
      .select("id, ten_chuan_hoa")
      .in("ten_chuan_hoa", norms);
    for (const c of existCusts || []) {
      custByNorm.set(c.ten_chuan_hoa, c.id);
    }

    const missingNorms = norms.filter((n) => !custByNorm.has(n));
    if (missingNorms.length) {
      const firstByNorm = new Map<string, any>();
      for (const c of clean) {
        const n = nameNorm.get(c.ten)!;
        if (!firstByNorm.has(n)) firstByNorm.set(n, c);
      }
      const newCusts = missingNorms.map((n) => {
        const r = firstByNorm.get(n);
        return { ten_khach_hang: r.ten, ten_chuan_hoa: n, dia_chi: r.dia_chi };
      });
      const { data: created } = await supabaseAdmin
        .from("pbh_khach_hang")
        .insert(newCusts)
        .select("id, ten_chuan_hoa");
      for (const c of created || []) {
        custByNorm.set(c.ten_chuan_hoa, c.id);
      }
    }

    // 2) Thiết lập trạng thái theo role: guest -> cho_duyet, admin/manager -> cho_in
    const trang_thai = session.role === "guest" ? "cho_duyet" : "cho_in";

    // 3) Dựng các dòng phiếu bảo hành (bỏ qua so_phieu để database tự sinh bằng SEQUENCE)
    const ticketRows = clean.map((c) => {
      const row: any = {
        khach_hang_id: custByNorm.get(nameNorm.get(c.ten)!) || null,
        ten_khach_hang: c.ten,
        dia_chi: c.dia_chi,
        model_name: c.model_name,
        loai_san_pham: c.loai_san_pham,
        hang_sx: c.hang_sx,
        cau_hinh: c.cau_hinh,
        serial: c.serial,
        so_ban_chup: c.so_ban_chup,
        so_thang: c.so_thang,
        dia_diem_bao_hanh: c.dia_diem_bao_hanh,
        nguoi_dang_ky: session.full_name,
        ma_tra_cuu: genCode(),
        trang_thai,
      };
      if (c.ngay_mua) row.ngay_mua = c.ngay_mua;
      return row;
    });

    let { data: ins, error } = await supabaseAdmin
      .from("pbh_phieu_bao_hanh")
      .insert(ticketRows)
      .select("id");

    // Phòng thủ nếu DB chưa migrate trường nguoi_dang_ky
    if (error && /nguoi_dang_ky/.test(error.message || "")) {
      const noCol = ticketRows.map(({ nguoi_dang_ky, ...r }) => r);
      ({ data: ins, error } = await supabaseAdmin.from("pbh_phieu_bao_hanh").insert(noCol).select("id"));
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // 4) Gửi thông báo Telegram
    const addedCount = ins?.length || 0;
    const isPending = trang_thai === "cho_duyet";
    await sendTelegramMessage(
      `${isPending ? "📥 <b>KHO YÊU CẦU IMPORT PHIẾU — CHỜ DUYỆT</b>" : "✅ <b>ĐÃ IMPORT LÔ PHIẾU MỚI (chờ in)</b>"}\n` +
        `-----------------------------------------\n` +
        `• <b>Người gửi:</b> ${session.full_name}\n` +
        `• <b>Tổng số phiếu:</b> ${addedCount} phiếu\n` +
        `• <b>Model lỗi/bỏ qua:</b> ${invalid.length} dòng\n\n` +
        `${isPending ? "⏳ <i>Vui lòng vào trang quản trị duyệt phiếu.</i>" : "🔗 <i>Phiếu đã sẵn sàng để in.</i>"}`
    );

    return NextResponse.json({ added: addedCount, invalid });
  } catch (err: any) {
    console.error("Sales ticket import error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
