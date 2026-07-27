-- Active: Supabase SQL Editor
-- Bảng lưu cấu hình CĂN PHÔI khi in phiếu bảo hành.
-- Mỗi dòng là 1 hồ sơ (nửa trên / nửa dưới của tờ phôi A4 xé đôi).
-- App vẫn chạy được khi bảng CHƯA tạo (tự dùng toạ độ mặc định trong code);
-- chạy migration này để lưu/căn chỉnh vĩnh viễn.

CREATE TABLE IF NOT EXISTS pbh_print_template (
    profile_key text PRIMARY KEY,          -- 'nua_tren' | 'nua_duoi'
    ten         text NOT NULL,
    offset_x    numeric NOT NULL DEFAULT 0, -- mm, dịch cả phiếu trục X (bù máy in)
    offset_y    numeric NOT NULL DEFAULT 0, -- mm, dịch cả phiếu trục Y
    font_pt     numeric NOT NULL DEFAULT 12,
    bg_src      text NOT NULL DEFAULT '',   -- ảnh phôi nền (đường dẫn public/)
    fields      jsonb NOT NULL DEFAULT '[]'::jsonb, -- mảng {key,x,y,w,align,bold,mono,fontPt}
    updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Trigger cập nhật updated_at (tái dùng hàm pbh_update_timestamp đã có từ schema gốc)
DROP TRIGGER IF EXISTS tr_pbh_print_template_update ON pbh_print_template;
CREATE TRIGGER tr_pbh_print_template_update
BEFORE UPDATE ON pbh_print_template
FOR EACH ROW EXECUTE FUNCTION pbh_update_timestamp();
