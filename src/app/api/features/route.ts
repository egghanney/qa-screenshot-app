import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Query all features with their screens
    const { data: features, error } = await supabase
      .from('qa_features')
      .select('id, name, purpose, created_at, updated_at, qa_screens(id)')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formatted = (features || []).map((f: any) => ({
      id: f.id,
      name: f.name || 'Untitled Feature',
      purpose: f.purpose || '',
      screen_count: Array.isArray(f.qa_screens) ? f.qa_screens.length : 0,
      created_at: f.created_at,
      updated_at: f.updated_at
    }));

    return NextResponse.json({
      success: true,
      total: formatted.length,
      features: formatted
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
