import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { HumanCharterReviewSchema } from '@/lib/mcp/contracts/schemas';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = HumanCharterReviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid review payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { charter_id, decision, reason, notes, reviewed_by, reviewed_at } = parsed.data;

    // 1. Fetch the charter to find feature_id
    const { data: charter, error: cErr } = await supabase
      .from('qa_charters')
      .select('id, feature_id, status')
      .eq('id', charter_id)
      .single();

    if (cErr || !charter) {
      return NextResponse.json({ error: 'Charter not found' }, { status: 404 });
    }

    // Map decision to status
    const statusMap: Record<string, string> = {
      Approved: 'Approved',
      Rejected: 'Rejected',
      Edited: 'Draft',
      Regenerated: 'Draft'
    };
    const newStatus = statusMap[decision] || 'Draft';

    // 2. Update charter status
    await supabase
      .from('qa_charters')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', charter_id);

    // 3. Persist review into feature's advanced_context
    if (charter.feature_id) {
      const { data: feature } = await supabase
        .from('qa_features')
        .select('advanced_context')
        .eq('id', charter.feature_id)
        .single();

      const existingReviews = (feature?.advanced_context as any)?.human_reviews || [];
      const updatedReviews = [
        ...existingReviews,
        {
          charter_id,
          decision,
          reason,
          notes,
          reviewed_by,
          reviewed_at
        }
      ];

      await supabase
        .from('qa_features')
        .update({
          advanced_context: {
            ...(feature?.advanced_context || {}),
            human_reviews: updatedReviews
          }
        })
        .eq('id', charter.feature_id);
    }

    return NextResponse.json({
      success: true,
      charter_id,
      decision,
      status: newStatus
    });
  } catch (err: any) {
    console.error('Error in /api/charters/review:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
