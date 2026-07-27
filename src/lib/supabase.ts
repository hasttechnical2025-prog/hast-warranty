import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc NEXT_PUBLIC_SUPABASE_ANON_KEY');
}
if (!supabaseServiceRoleKey) {
  throw new Error('Thiếu SUPABASE_SERVICE_ROLE_KEY');
}

// Client public cho phía client-side (nếu dùng).
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client service role cho API route phía server (bypass RLS). Tuyệt đối không dùng
// ở phía client — key này phải chỉ tồn tại trên server.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
