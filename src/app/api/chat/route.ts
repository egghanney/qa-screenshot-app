import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { askAIFeatureCopilot } from '@/lib/ai/service';
import { Feature, ScreenItem, KnowledgeItem, QACheckpoint } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { feature_id, message, api_key } = body;

    const { data: featData } = await supabase
      .from('qa_features')
      .select('*')
      .eq('id', feature_id)
      .single();

    const { data: screens } = await supabase
      .from('qa_screens')
      .select('*')
      .eq('feature_id', feature_id)
      .order('screen_number', { ascending: true });

    const { data: knowledge } = await supabase
      .from('qa_knowledge_items')
      .select('*')
      .eq('feature_id', feature_id);

    const { data: checkpoints } = await supabase
      .from('qa_checkpoints')
      .select('*')
      .eq('feature_id', feature_id);

    if (!featData) {
      return NextResponse.json({ error: 'Feature not found' }, { status: 404 });
    }

    const reply = await askAIFeatureCopilot(
      message,
      featData as Feature,
      (screens || []) as ScreenItem[],
      (knowledge || []) as KnowledgeItem[],
      (checkpoints || []) as QACheckpoint[],
      api_key
    );

    return NextResponse.json({ success: true, reply });
  } catch (err: any) {
    console.error('Error in /api/chat:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
