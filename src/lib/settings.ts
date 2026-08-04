// Cấu hình ứng dụng cho phép admin tùy biến thương hiệu & nội dung hiển thị.
// Lưu ở bảng pbh_app_settings (1 dòng, cột data jsonb). App vẫn chạy khi bảng
// chưa migrate (tự dùng DEFAULT_SETTINGS).

export interface BenefitItem {
  text: string;
  icon: string; // tên icon trong BENEFIT_ICON_MAP
}

export interface AppSettings {
  system_name: string; // tên hệ thống ở Header
  system_subtitle: string; // phụ đề Header
  logo_data_url: string; // logo dạng data URL (rỗng = dùng icon mặc định)
  reg_panel_title: string; // tiêu đề panel trái trang đăng ký
  reg_panel_desc: string; // mô tả panel
  reg_panel_benefits: BenefitItem[]; // các dòng lợi ích (có icon riêng)
  reg_panel_footer: string; // dòng chân panel
  letterhead_data_url: string; // ảnh letterhead cho phụ lục serial (rỗng = header chữ)
  enable_lookup: boolean; // Bật/tắt tính năng quét mã QR tra cứu
}

export const DEFAULT_SETTINGS: AppSettings = {
  system_name: "HSTC Warranty",
  system_subtitle: "Hệ thống Bảo hành",
  logo_data_url: "",
  reg_panel_title: "Phiếu bảo hành điện tử",
  reg_panel_desc:
    "Tạo và cấp phiếu bảo hành cho khách hàng chỉ trong một biểu mẫu — nhanh, chính xác, có mã QR tra cứu.",
  reg_panel_benefits: [
    { text: "Khách quét mã QR tự tra cứu bảo hành", icon: "QrCode" },
    { text: "Lưu trữ tập trung, không lo thất lạc", icon: "Cloud" },
    { text: "In khớp phôi giấy A5 ngang có sẵn", icon: "Printer" },
  ],
  reg_panel_footer: "HSTC · Hệ thống Bảo hành",
  letterhead_data_url: "",
  enable_lookup: true,
};

// Gộp dữ liệu DB với mặc định (điền thiếu, bỏ giá trị rỗng/không hợp lệ).
export function mergeSettings(data: any): AppSettings {
  const d = data && typeof data === "object" ? data : {};
  // Tương thích ngược: dữ liệu cũ là mảng chuỗi -> chuyển sang {text, icon}.
  let benefits: BenefitItem[];
  if (Array.isArray(d.reg_panel_benefits) && d.reg_panel_benefits.length) {
    benefits = d.reg_panel_benefits
      .map((x: any): BenefitItem =>
        typeof x === "string"
          ? { text: x, icon: "ShieldCheck" }
          : { text: String(x?.text ?? ""), icon: String(x?.icon || "ShieldCheck") }
      )
      .filter((b: BenefitItem) => b.text.trim() !== "");
    if (!benefits.length) benefits = DEFAULT_SETTINGS.reg_panel_benefits;
  } else {
    benefits = DEFAULT_SETTINGS.reg_panel_benefits;
  }
  return {
    system_name: d.system_name || DEFAULT_SETTINGS.system_name,
    system_subtitle: d.system_subtitle || DEFAULT_SETTINGS.system_subtitle,
    logo_data_url: typeof d.logo_data_url === "string" ? d.logo_data_url : "",
    reg_panel_title: d.reg_panel_title || DEFAULT_SETTINGS.reg_panel_title,
    reg_panel_desc: d.reg_panel_desc || DEFAULT_SETTINGS.reg_panel_desc,
    reg_panel_benefits: benefits,
    reg_panel_footer: d.reg_panel_footer || DEFAULT_SETTINGS.reg_panel_footer,
    letterhead_data_url: typeof d.letterhead_data_url === "string" ? d.letterhead_data_url : "",
    enable_lookup: typeof d.enable_lookup === "boolean" ? d.enable_lookup : DEFAULT_SETTINGS.enable_lookup,
  };
}
