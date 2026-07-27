// Cấu hình ứng dụng cho phép admin tùy biến thương hiệu & nội dung hiển thị.
// Lưu ở bảng pbh_app_settings (1 dòng, cột data jsonb). App vẫn chạy khi bảng
// chưa migrate (tự dùng DEFAULT_SETTINGS).

export interface AppSettings {
  system_name: string; // tên hệ thống ở Header
  system_subtitle: string; // phụ đề Header
  logo_data_url: string; // logo dạng data URL (rỗng = dùng icon mặc định)
  reg_panel_title: string; // tiêu đề panel trái trang đăng ký
  reg_panel_desc: string; // mô tả panel
  reg_panel_benefits: string[]; // các dòng lợi ích
  reg_panel_footer: string; // dòng chân panel
}

export const DEFAULT_SETTINGS: AppSettings = {
  system_name: "HSTC Warranty",
  system_subtitle: "Hệ thống Bảo hành",
  logo_data_url: "",
  reg_panel_title: "Phiếu bảo hành điện tử",
  reg_panel_desc:
    "Tạo và cấp phiếu bảo hành cho khách hàng chỉ trong một biểu mẫu — nhanh, chính xác, có mã QR tra cứu.",
  reg_panel_benefits: [
    "Khách quét mã QR tự tra cứu bảo hành",
    "Lưu trữ tập trung, không lo thất lạc",
    "In khớp phôi giấy A5 ngang có sẵn",
  ],
  reg_panel_footer: "HSTC · Hệ thống Bảo hành",
};

// Gộp dữ liệu DB với mặc định (điền thiếu, bỏ giá trị rỗng/không hợp lệ).
export function mergeSettings(data: any): AppSettings {
  const d = data && typeof data === "object" ? data : {};
  const benefits =
    Array.isArray(d.reg_panel_benefits) && d.reg_panel_benefits.length
      ? d.reg_panel_benefits.filter((x: any) => typeof x === "string")
      : DEFAULT_SETTINGS.reg_panel_benefits;
  return {
    system_name: d.system_name || DEFAULT_SETTINGS.system_name,
    system_subtitle: d.system_subtitle || DEFAULT_SETTINGS.system_subtitle,
    logo_data_url: typeof d.logo_data_url === "string" ? d.logo_data_url : "",
    reg_panel_title: d.reg_panel_title || DEFAULT_SETTINGS.reg_panel_title,
    reg_panel_desc: d.reg_panel_desc || DEFAULT_SETTINGS.reg_panel_desc,
    reg_panel_benefits: benefits,
    reg_panel_footer: d.reg_panel_footer || DEFAULT_SETTINGS.reg_panel_footer,
  };
}
