import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { resolveFeatureRecord } from '@/lib/mcp/engine/aiEngine';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const featureParam = (body.feature || body.feature_id || body.feature_name || 'latest').trim();
    const charters = Array.isArray(body.charters) ? body.charters : [];

    if (charters.length === 0) {
      return NextResponse.json({ 
        error: 'Invalid payload: "charters" array is empty or missing.' 
      }, { status: 400 });
    }

    // 1. Resolve target feature
    const feature = await resolveFeatureRecord(featureParam);
    const resolvedId = feature.id;

    // 2. Clean up previous draft charters for this feature to prevent duplication
    const { data: existingCharters } = await supabase
      .from('qa_charters')
      .select('id')
      .eq('feature_id', resolvedId);

    if (existingCharters && existingCharters.length > 0) {
      const ids = existingCharters.map(c => c.id);
      await supabase.from('qa_charter_scenarios').delete().in('charter_id', ids);
      await supabase.from('qa_charters').delete().eq('feature_id', resolvedId);
    }

    // 3. Insert new charters and scenarios
    let savedChartersCount = 0;
    let savedScenariosCount = 0;

    for (let i = 0; i < charters.length; i++) {
      const c = charters[i];
      const charterCode = c.charter_code || `CH-${String(i + 1).padStart(2, '0')}`;

      const { data: inserted, error: cErr } = await supabase
        .from('qa_charters')
        .insert({
          charter_code: charterCode,
          title: c.title || `Charter ${i + 1}`,
          mission: c.mission || '',
          user_persona: c.user_persona || 'Target User',
          starting_condition: c.starting_condition || '',
          expected_outcome: c.expected_outcome || '',
          scope: 'feature',
          status: 'Draft',
          feature_id: resolvedId,
          project_id: feature.project_id || null
        })
        .select('*')
        .single();

      if (cErr || !inserted) {
        console.error(`Error saving charter ${charterCode}:`, cErr);
        continue;
      }
      savedChartersCount++;

      // Insert scenarios
      const rawScenarios = Array.isArray(c.scenarios) ? c.scenarios : [];
      const scenariosToInsert = rawScenarios.map((s: any, sIdx: number) => ({
        charter_id: inserted.id,
        prompt_id: s.prompt_id || `${String(i + 1).padStart(2, '0')}-P${String(sIdx + 1).padStart(2, '0')}`,
        prompt_text: s.prompt_text || s.exploration_prompt || s.scenario || '',
        status: 'Untested',
        observations: '',
        sort_order: sIdx + 1,
        traceability: s.traceability || null
      }));

      if (scenariosToInsert.length > 0) {
        const { error: sErr } = await supabase
          .from('qa_charter_scenarios')
          .insert(scenariosToInsert);

        if (!sErr) {
          savedScenariosCount += scenariosToInsert.length;
        } else {
          console.error(`Error saving scenarios for ${charterCode}:`, sErr);
        }
      }
    }

    // 4. Update feature metadata timestamp
    await supabase
      .from('qa_features')
      .update({
        updated_at: new Date().toISOString()
      })
      .eq('id', resolvedId);

    return NextResponse.json({
      success: true,
      feature_id: resolvedId,
      feature_name: feature.name,
      charters_saved: savedChartersCount,
      scenarios_saved: savedScenariosCount,
      message: `Successfully synced ${savedChartersCount} charters and ${savedScenariosCount} scenarios to QA Studio.`
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  } catch (err: any) {
    console.error('Error in /api/charters/sync:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
