import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { question_id, answer, feature_id } = body;

    if (!question_id || !answer) {
      return NextResponse.json({ error: 'Question ID and answer required' }, { status: 400 });
    }

    // Update question
    const { data: qData, error: qErr } = await supabase
      .from('qa_questions')
      .update({
        answer,
        status: 'Answered',
        updated_at: new Date().toISOString()
      })
      .eq('id', question_id)
      .select()
      .single();

    if (qErr) throw qErr;

    // Add or promote corresponding knowledge item
    if (feature_id && qData) {
      await supabase.from('qa_knowledge_items').insert({
        feature_id,
        category: qData.category || 'Business Rules & Constraints',
        title: `Resolved: ${qData.question.substring(0, 40)}...`,
        content: answer,
        source: 'Q&A',
        confidence: 'CONFIRMED',
        verification_status: 'Verified',
        notes: `Clarified via AI Questions: "${qData.question}"`
      });
    }

    return NextResponse.json({ success: true, question: qData });
  } catch (err: any) {
    console.error('Error in /api/knowledge/questions:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
