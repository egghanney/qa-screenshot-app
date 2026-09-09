import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { generateFollowUpCharters } from '@/lib/mcp/engine/aiEngine';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { feature_id, charter_id, prompt_id, observation } = body;

    if (!feature_id || !prompt_id) {
      return NextResponse.json(
        { error: 'feature_id and prompt_id are required' },
        { status: 400 }
      );
    }

    // 1. Fetch feature to get project_id
    const { data: feature, error: fErr } = await supabase
      .from('qa_features')
      .select('id, project_id')
      .eq('id', feature_id)
      .single();

    if (fErr || !feature) {
      return NextResponse.json({ error: 'Feature not found' }, { status: 404 });
    }

    // 2. Generate Follow-up Charter via AI Engine
    const followUps = await generateFollowUpCharters(feature_id, [
      {
        charter_id: charter_id || 'unknown',
        prompt_id,
        observation: observation || 'Failure / blocker observed during testing'
      }
    ]);

    if (followUps.length === 0) {
      return NextResponse.json({ error: 'Failed to generate follow-up charter' }, { status: 500 });
    }

    const followUp = followUps[0];

    // Count existing charters to assign code
    const { count } = await supabase
      .from('qa_charters')
      .select('*', { count: 'exact', head: true })
      .eq('feature_id', feature_id);

    const charterCode = `FUP-${String((count || 0) + 1).padStart(2, '0')}`;

    // 3. Persist follow-up charter into qa_charters
    const { data: inserted, error: cErr } = await supabase
      .from('qa_charters')
      .insert({
        charter_code: charterCode,
        title: followUp.title,
        mission: followUp.mission,
        user_persona: 'Investigative Defect Specialist',
        starting_condition: `App in reproducible state for prompt ${prompt_id}`,
        expected_outcome: 'Failure boundaries isolated; recovery behavior verified.',
        scope: 'feature',
        status: 'Draft',
        feature_id,
        project_id: feature.project_id
      })
      .select('*')
      .single();

    if (cErr || !inserted) {
      return NextResponse.json({ error: 'Failed to save follow-up charter' }, { status: 500 });
    }

    // 4. Insert follow-up scenarios
    const scenariosToInsert = followUp.exploration_prompts.map((p, pIdx) => ({
      charter_id: inserted.id,
      prompt_id: p.id,
      prompt_text: p.prompt,
      status: 'Untested',
      observations: '',
      media_url: '',
      sort_order: pIdx
    }));

    await supabase.from('qa_charter_scenarios').insert(scenariosToInsert);

    return NextResponse.json({
      success: true,
      charter: {
        ...inserted,
        scenarios: scenariosToInsert
      }
    });
  } catch (err: any) {
    console.error('Error in /api/charters/follow-up:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
