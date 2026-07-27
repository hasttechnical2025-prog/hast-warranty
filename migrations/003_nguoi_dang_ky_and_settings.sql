-- Active: Supabase SQL Editor
-- Migration 003:
--   1) Thêm cột "người đăng ký" cho phiếu bảo hành
--   2) Bảng cấu hình ứng dụng (logo, thương hiệu, panel đăng ký...)
--   3) Hàm đặt số phiếu kế tiếp (reset khi lên production)

-- 1) Người đăng ký yêu cầu cấp phiếu
ALTER TABLE pbh_phieu_bao_hanh
    ADD COLUMN IF NOT EXISTS nguoi_dang_ky text;

-- 2) Cấu hình ứng dụng — luôn 1 dòng (id = 1), dữ liệu dạng jsonb linh hoạt
CREATE TABLE IF NOT EXISTS pbh_app_settings (
    id         smallint PRIMARY KEY DEFAULT 1,
    data       jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pbh_settings_single_row CHECK (id = 1)
);
INSERT INTO pbh_app_settings (id, data) VALUES (1, '{}'::jsonb) ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS tr_pbh_app_settings_update ON pbh_app_settings;
CREATE TRIGGER tr_pbh_app_settings_update
BEFORE UPDATE ON pbh_app_settings
FOR EACH ROW EXECUTE FUNCTION pbh_update_timestamp();

-- 3) Đặt số phiếu kế tiếp. setval(..., n, false) => lần nextval kế tiếp trả về đúng n.
CREATE OR REPLACE FUNCTION pbh_set_next_so_phieu(n bigint)
RETURNS void AS $$
BEGIN
    PERFORM setval('pbh_so_phieu_seq', n, false);
END;
$$ LANGUAGE plpgsql;
