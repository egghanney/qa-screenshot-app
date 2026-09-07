import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { analyzeScreenWithAI, isRawDeviceFilename } from '@/lib/ai/service';
import { Feature, ScreenItem } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { feature_id, api_key, force_all } = body;

    if (!feature_id) {
      return NextResponse.json({ error: 'feature_id is required' }, { status: 400 });
    }

    // 1. Fetch feature
    const { data: featData, error: fErr } = await supabase
      .from('qa_features')
      .select('*')
      .eq('id', feature_id)
      .single();

    if (fErr || !featData) {
      return NextResponse.json({ error: 'Feature not found' }, { status: 404 });
    }

    const feature = featData as Feature;

    // 2. Fetch screens for this feature
    const { data: screensData, error: sErr } = await supabase
      .from('qa_screens')
      .select('*')
      .eq('feature_id', feature_id)
      .order('screen_number', { ascending: true });

    if (sErr) {
      return NextResponse.json({ error: sErr.message }, { status: 500 });
    }

    const screens = (screensData || []) as ScreenItem[];
    if (screens.length === 0) {
      return NextResponse.json({ success: true, updatedCount: 0, screens: [] });
    }

    let updatedCount = 0;
    const updatedScreens: ScreenItem[] = [];

    for (const scr of screens) {
      const isRaw = isRawDeviceFilename(scr.name);
      if (force_all || isRaw) {
        try {
          const analysis = await analyzeScreenWithAI(
            scr.screen_number,
            scr.image_url,
            feature,
            undefined, // do not pass raw filename hint
            api_key
          );

          const newName = analysis.screen_name || `Step ${scr.screen_number} View`;

          const { data: upd, error: uErr } = await supabase
            .from('qa_screens')
            .update({
              name: newName,
              state: analysis.state || scr.state || 'normal',
              user_action: analysis.suggested_user_action || scr.user_action,
              expected_behavior: analysis.suggested_system_response || scr.expected_behavior,
              ai_analysis: analysis,
              updated_at: new Date().toISOString()
            })
            .eq('id', scr.id)
            .select('*')
            .single();

          if (!uErr && upd) {
            updatedScreens.push(upd as ScreenItem);
            updatedCount++;

            // Synchronize corresponding journey node label if it matches
            await supabase
              .from('qa_journey_nodes')
              .update({ label: newName })
              .eq('screen_id', scr.id);
          } else {
            updatedScreens.push(scr);
          }
        } catch (err) {
          console.warn(`Failed auto-naming screen #${scr.screen_number}:`, err);
          updatedScreens.push(scr);
        }
      } else {
        updatedScreens.push(scr);
      }
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      screens: updatedScreens
    });
  } catch (err: any) {
    console.error('Error in /api/screens/auto-name:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
