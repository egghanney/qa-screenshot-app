import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { analyzeScreenWithAI } from '@/lib/ai/service';
import { Feature, ScreenItem } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { screen_id, feature_id, image_url, screen_number, existing_name, api_key } = body;

    // Fetch feature context
    const { data: featureData, error: featError } = await supabase
      .from('qa_features')
      .select('*')
      .eq('id', feature_id)
      .single();

    if (featError || !featureData) {
      return NextResponse.json({ error: 'Feature not found' }, { status: 404 });
    }

    const feature = featureData as Feature;
    const aiAnalysis = await analyzeScreenWithAI(
      screen_number || 1,
      image_url,
      feature,
      existing_name,
      api_key
    );

    // Update screen in database
    if (screen_id) {
      const { data: updatedScreen, error: updateError } = await supabase
        .from('qa_screens')
        .update({
          name: aiAnalysis.screen_name || existing_name || `Screen ${screen_number}`,
          state: aiAnalysis.state || 'normal',
          user_action: aiAnalysis.suggested_user_action || null,
          expected_behavior: aiAnalysis.suggested_system_response || null,
          ai_analysis: aiAnalysis,
          updated_at: new Date().toISOString()
        })
        .eq('id', screen_id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating screen in DB:', updateError);
      }
      return NextResponse.json({ success: true, screen: updatedScreen || { ai_analysis: aiAnalysis } });
    }

    return NextResponse.json({ success: true, analysis: aiAnalysis });
  } catch (error: any) {
    console.error('Error in /api/screens/analyze:', error);
    return NextResponse.json({ error: error.message || 'Analysis failed' }, { status: 500 });
  }
}
