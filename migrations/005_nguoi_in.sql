-- Active: Supabase SQL Editor
-- Migration 005: lưu "người in" phiếu (truy vết ai đã in để trình admin ký/đóng dấu).
-- App vẫn chạy khi chưa migrate (API bỏ qua cột này nếu chưa có).

ALTER TABLE pbh_phieu_bao_hanh
    ADD COLUMN IF NOT EXISTS nguoi_in text;
