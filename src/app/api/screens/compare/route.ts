import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { compareScreens } from '@/lib/ai/service';
import { Feature, ScreenItem } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { feature_id, screen_a_id, screen_b_id, api_key } = body;

    const { data: featData } = await supabase
      .from('qa_features')
      .select('*')
      .eq('id', feature_id)
      .single();

    const { data: screenA } = await supabase
      .from('qa_screens')
      .select('*')
      .eq('id', screen_a_id)
      .single();

    const { data: screenB } = await supabase
      .from('qa_screens')
      .select('*')
      .eq('id', screen_b_id)
      .single();

    if (!featData || !screenA || !screenB) {
      return NextResponse.json({ error: 'Missing feature or screens' }, { status: 404 });
    }

    const diffResult = await compareScreens(screenA as ScreenItem, screenB as ScreenItem, featData as Feature, api_key);

    // Persist comparison
    const { data: savedComp } = await supabase
      .from('qa_screen_comparisons')
      .insert({
        feature_id,
        screen_a_id,
        screen_b_id,
        diff_summary: diffResult.diff_summary,
        detected_changes: diffResult
      })
      .select()
      .single();

    return NextResponse.json({ success: true, comparison: savedComp || diffResult });
  } catch (err: any) {
    console.error('Error in /api/screens/compare:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
