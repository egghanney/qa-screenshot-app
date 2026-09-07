import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { generateFeatureKnowledge } from '@/lib/ai/service';
import { Feature, ScreenItem } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { feature_id, api_key } = body;

    const { data: featureData, error: featErr } = await supabase
      .from('qa_features')
      .select('*')
      .eq('id', feature_id)
      .single();

    if (featErr || !featureData) {
      return NextResponse.json({ error: 'Feature not found' }, { status: 404 });
    }

    const { data: screensData } = await supabase
      .from('qa_screens')
      .select('*')
      .eq('feature_id', feature_id)
      .order('screen_number', { ascending: true });

    const feature = featureData as Feature;
    const screens = (screensData || []) as ScreenItem[];

    const { items, questions } = await generateFeatureKnowledge(feature, screens, api_key);

    // Save knowledge items
    if (items.length > 0) {
      // Clear previous auto-generated items if regenerating
      await supabase.from('qa_knowledge_items').delete().eq('feature_id', feature_id);
      const { error: insErr } = await supabase.from('qa_knowledge_items').insert(items);
      if (insErr) console.error('Error inserting knowledge items:', insErr);
    }

    // Save questions
    if (questions.length > 0) {
      await supabase.from('qa_questions').delete().eq('feature_id', feature_id).eq('status', 'Pending');
      const { error: qErr } = await supabase.from('qa_questions').insert(questions);
      if (qErr) console.error('Error inserting questions:', qErr);
    }

    // Fetch freshly saved items
    const { data: savedItems } = await supabase
      .from('qa_knowledge_items')
      .select('*')
      .eq('feature_id', feature_id)
      .order('created_at', { ascending: true });

    const { data: savedQuestions } = await supabase
      .from('qa_questions')
      .select('*')
      .eq('feature_id', feature_id)
      .order('created_at', { ascending: true });

    return NextResponse.json({
      success: true,
      items: savedItems || items,
      questions: savedQuestions || questions
    });
  } catch (err: any) {
    console.error('Error in /api/knowledge/generate:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate knowledge' }, { status: 500 });
  }
}
