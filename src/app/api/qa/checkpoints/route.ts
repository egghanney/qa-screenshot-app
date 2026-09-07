import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { generateQACheckpoints } from '@/lib/ai/service';
import { Feature, ScreenItem } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { feature_id, api_key } = body;

    const { data: featData, error: fErr } = await supabase
      .from('qa_features')
      .select('*')
      .eq('id', feature_id)
      .single();

    if (fErr || !featData) {
      return NextResponse.json({ error: 'Feature not found' }, { status: 404 });
    }

    const { data: screensData } = await supabase
      .from('qa_screens')
      .select('*')
      .eq('feature_id', feature_id)
      .order('screen_number', { ascending: true });

    const feature = featData as Feature;
    const screens = (screensData || []) as ScreenItem[];

    const checkpoints = await generateQACheckpoints(feature, screens, api_key);

    // Save checkpoints
    await supabase.from('qa_checkpoints').delete().eq('feature_id', feature_id);
    const { error: insErr } = await supabase.from('qa_checkpoints').insert(checkpoints);
    if (insErr) console.error('Error inserting checkpoints:', insErr);

    const { data: savedCP } = await supabase
      .from('qa_checkpoints')
      .select('*')
      .eq('feature_id', feature_id)
      .order('created_at', { ascending: true });

    return NextResponse.json({ success: true, checkpoints: savedCP || checkpoints });
  } catch (err: any) {
    console.error('Error in /api/qa/checkpoints:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
