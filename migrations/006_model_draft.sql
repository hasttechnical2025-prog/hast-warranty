-- Active: Supabase SQL Editor
-- Migration 006: cờ "nháp" cho model do guest/manager tự thêm khi đăng ký.
-- Admin chuẩn hoá (sửa/thêm) sẽ bỏ cờ này. App vẫn chạy khi chưa migrate.

ALTER TABLE pbh_models
    ADD COLUMN IF NOT EXISTS is_draft boolean NOT NULL DEFAULT false;
