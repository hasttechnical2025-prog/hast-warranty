// Mô hình dữ liệu cho việc CĂN PHÔI khi in phiếu bảo hành.
// Toạ độ mọi trường tính bằng MILIMET, gốc là góc trên-trái tờ A5 ngang (210 x 148mm).
// Mỗi "hồ sơ" (profile) là một cách căn cho một nửa phôi (nửa trên / nửa dưới của tờ A4
// bị xé đôi) — hai nửa nhà in làm lệch nhau nên cần căn riêng.

export const SHEET_W_MM = 210;
export const SHEET_H_MM = 148;

export type FieldKey =
  | "so_phieu"
  | "thang"
  | "nam"
  | "ten_kh"
  | "dia_chi"
  | "loai_sp"
  | "hang_sx"
  | "model"
  | "serial"
  | "cau_hinh"
  | "diadiem_tt"
  | "diadiem_kh"
  | "che_do_ban"
  | "che_do_thang"
  | "qr";

export interface FieldDef {
  key: FieldKey;
  label: string; // tên hiển thị trong trình căn phôi
  x: number; // mm - mép trái
  y: number; // mm - mép trên
  w?: number; // mm - bề rộng (căn giữa / giới hạn + tự thu nhỏ)
  align?: "left" | "center";
  bold?: boolean;
  mono?: boolean;
  fontPt?: number; // ghi đè cỡ chữ; mặc định lấy theo profile.font_pt
}

export interface TemplateProfile {
  profile_key: string; // 'nua_tren' | 'nua_duoi'
  ten: string;
  offset_x: number; // mm - dịch cả phiếu theo trục X (bù sai số máy in)
  offset_y: number; // mm - dịch cả phiếu theo trục Y
  font_pt: number; // cỡ chữ mặc định cho cả phiếu
  bg_src: string; // ảnh phôi nền (chỉ xem trên màn hình để căn, không in ra)
  fields: FieldDef[];
}

// Dữ liệu vé mẫu tối thiểu để render (khớp cột DB).
export interface TicketLike {
  so_phieu: number;
  ngay_mua: string;
  ten_khach_hang: string;
  dia_chi: string;
  model_name: string;
  loai_san_pham: string;
  hang_sx: string;
  cau_hinh: string;
  serial: string | null;
  dia_diem_bao_hanh: string;
  so_ban_chup: number;
  so_thang: number;
  so_may?: number;
  ma_tra_cuu?: string;
}

// Toạ độ mặc định (đã căn theo phôi thật, cỡ chữ 12pt). Người dùng có thể kéo-thả
// tinh chỉnh lại trong trình Căn phôi; giá trị lưu vào DB sẽ ghi đè các mặc định này.
export const DEFAULT_FIELDS: FieldDef[] = [
  { key: "so_phieu", label: "Số phiếu", x: 170, y: 27.3, w: 36, align: "left", bold: true },
  { key: "thang", label: "Tháng", x: 184, y: 31.5, w: 10, align: "center" },
  { key: "nam", label: "Năm", x: 195, y: 31.5, w: 14, align: "center" },
  { key: "ten_kh", label: "Tên khách hàng", x: 45, y: 42.5, w: 150, align: "left", bold: true },
  { key: "dia_chi", label: "Địa chỉ", x: 24, y: 48.3, w: 172, align: "left" },
  { key: "loai_sp", label: "Loại sản phẩm", x: 41, y: 60.8, w: 82, align: "left" },
  { key: "hang_sx", label: "Hãng sản xuất", x: 131, y: 60.8, w: 72, align: "left" },
  { key: "model", label: "Model", x: 22, y: 66.9, w: 95, align: "left", bold: true },
  { key: "serial", label: "Số serial", x: 125, y: 66.9, w: 78, align: "left", bold: true, mono: true },
  { key: "cau_hinh", label: "Cấu hình", x: 48, y: 73.2, w: 140, align: "left" },
  { key: "diadiem_tt", label: "Tick: Tại trung tâm", x: 28, y: 85.6, align: "left", bold: true },
  { key: "diadiem_kh", label: "Tick: Tại khách hàng", x: 116, y: 85.6, align: "left", bold: true },
  { key: "che_do_ban", label: "Số bản chụp", x: 42, y: 91.9, w: 25, align: "center", bold: true },
  { key: "che_do_thang", label: "Số tháng", x: 106, y: 91.9, w: 12, align: "center", bold: true },
  { key: "qr", label: "Mã QR", x: 10, y: 27, align: "left" },
];

export function makeDefaultProfile(profile_key: string, ten: string, bg_src: string): TemplateProfile {
  return {
    profile_key,
    ten,
    offset_x: 0,
    offset_y: 0,
    font_pt: 12,
    bg_src,
    // deep-copy để mỗi hồ sơ có mảng field độc lập
    fields: DEFAULT_FIELDS.map((f) => ({ ...f })),
  };
}

export const DEFAULT_PROFILES: TemplateProfile[] = [
  makeDefaultProfile("nua_tren", "Nửa trên", "/phoi-tren.png"),
  makeDefaultProfile("nua_duoi", "Nửa dưới", "/phoi-duoi.png"),
];

// Gộp hồ sơ từ DB với mặc định: đảm bảo mọi field key đều có (tương thích khi
// bổ sung field mới sau này), giữ toạ độ đã lưu cho các field đã có.
export function mergeProfile(def: TemplateProfile, row: any): TemplateProfile {
  const savedFields: FieldDef[] = Array.isArray(row?.fields) ? row.fields : [];
  const byKey = new Map(savedFields.map((f) => [f.key, f]));
  const fields = DEFAULT_FIELDS.map((d) => {
    const saved = byKey.get(d.key);
    return saved ? { ...d, ...saved, key: d.key, label: d.label } : { ...d };
  });
  return {
    profile_key: def.profile_key,
    ten: row?.ten ?? def.ten,
    offset_x: Number(row?.offset_x ?? 0),
    offset_y: Number(row?.offset_y ?? 0),
    font_pt: Number(row?.font_pt ?? 12),
    bg_src: row?.bg_src || def.bg_src,
    fields,
  };
}

function datePart(ngay_mua: string, idx: number): string {
  const parts = (ngay_mua || "").slice(0, 10).split("-"); // [YYYY, MM, DD]
  return parts[idx] || "";
}

// Nội dung hiển thị của từng trường theo dữ liệu phiếu. Trả "" nếu không có dữ liệu.
export function fieldContent(key: FieldKey, t: TicketLike): string {
  switch (key) {
    case "so_phieu":
      return String(t.so_phieu ?? "");
    case "thang":
      return datePart(t.ngay_mua, 1);
    case "nam":
      return datePart(t.ngay_mua, 0);
    case "ten_kh":
      return (t.ten_khach_hang || "").toUpperCase();
    case "dia_chi":
      return t.dia_chi || "";
    case "loai_sp":
      return t.loai_san_pham || "";
    case "hang_sx":
      return t.hang_sx || "";
    case "model":
      return t.model_name || "";
    case "serial":
      // Phiếu nhiều máy -> serial ghi "theo danh sách đính kèm"
      return Number(t.so_may) > 1 ? `Theo DS đính kèm (${t.so_may} máy)` : t.serial || "";
    case "cau_hinh":
      return t.cau_hinh || "";
    case "diadiem_tt":
      return t.dia_diem_bao_hanh === "Tại trung tâm" ? "✓" : "";
    case "diadiem_kh":
      return t.dia_diem_bao_hanh === "Tại khách hàng" ? "✓" : "";
    case "che_do_ban":
      // 0 = không bảo hành theo bản chụp -> để trống trên phôi
      return Number(t.so_ban_chup) > 0 ? Number(t.so_ban_chup).toLocaleString("vi-VN") : "";
    case "che_do_thang":
      return Number(t.so_thang) > 0 ? String(t.so_thang) : "";
    case "qr":
      return "";
  }
}
