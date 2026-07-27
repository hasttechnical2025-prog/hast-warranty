import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdminAuthenticated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('pbh_models')
      .select('*')
      .order('model_name', { ascending: true });

    if (error) {
      console.error("Error fetching models:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Unexpected error fetching models:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, model_name, loai_san_pham, hang_sx, cau_hinh, so_ban_chup_mac_dinh, so_thang_mac_dinh } = body;

    if (!model_name || !hang_sx) {
      return NextResponse.json({ error: "Vui lòng nhập Model và Hãng SX" }, { status: 400 });
    }

    const payload = {
      model_name: model_name.trim(),
      loai_san_pham: loai_san_pham?.trim() || "Máy photocopy",
      hang_sx: hang_sx.trim(),
      cau_hinh: cau_hinh?.trim() || "Copy-In-Quét",
      so_ban_chup_mac_dinh: Number(so_ban_chup_mac_dinh) || 100000,
      so_thang_mac_dinh: Number(so_thang_mac_dinh) || 12,
    };

    if (id) {
      // Update
      const { data, error } = await supabaseAdmin
        .from('pbh_models')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    } else {
      // Insert
      const { data, error } = await supabaseAdmin
        .from('pbh_models')
        .insert(payload)
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('pbh_models')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
