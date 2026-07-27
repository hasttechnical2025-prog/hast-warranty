import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { removeVietnameseTones } from '@/lib/tiengViet';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';

    if (query.length < 2) {
      return NextResponse.json([]); // return empty if query is too short
    }

    const normalizedQuery = removeVietnameseTones(query);
    const searchPattern = `%${normalizedQuery.split(' ').join('%')}%`; // Allows matching "ban qlda mau" with "ban quan ly du an ca mau"

    const { data, error } = await supabaseAdmin
      .from('pbh_khach_hang')
      .select('id, ten_khach_hang, dia_chi')
      .ilike('ten_chuan_hoa', searchPattern)
      .limit(10);

    if (error) {
      console.error("Error searching customers:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Unexpected error searching customers:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
