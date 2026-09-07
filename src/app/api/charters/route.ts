import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { QACharter, CharterScenario } from '@/lib/types';

// GET: Fetch charters with scenarios for a feature or project
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const featureId = searchParams.get('feature_id');
    const projectId = searchParams.get('project_id');

    let query = supabase.from('qa_charters').select('*');

    if (featureId) {
      query = query.eq('feature_id', featureId);
    } else if (projectId && projectId !== 'all') {
      query = query.eq('project_id', projectId);
    }

    const { data: charters, error: cErr } = await query.order('created_at', { ascending: true });
    if (cErr) {
      return NextResponse.json({ error: cErr.message }, { status: 500 });
    }

    if (!charters || charters.length === 0) {
      return NextResponse.json({ success: true, charters: [] });
    }

    const charterIds = charters.map(c => c.id);
    const { data: scenarios, error: sErr } = await supabase
      .from('qa_charter_scenarios')
      .select('*')
      .in('charter_id', charterIds)
      .order('sort_order', { ascending: true });

    if (sErr) {
      return NextResponse.json({ error: sErr.message }, { status: 500 });
    }

    const scenariosByCharter = (scenarios || []).reduce((acc: Record<string, CharterScenario[]>, s: CharterScenario) => {
      if (!acc[s.charter_id]) acc[s.charter_id] = [];
      acc[s.charter_id].push(s);
      return acc;
    }, {});

    const enrichedCharters: QACharter[] = charters.map(c => ({
      ...c,
      scenarios: scenariosByCharter[c.id] || []
    }));

    return NextResponse.json({ success: true, charters: enrichedCharters });
  } catch (err: any) {
    console.error('Error in GET /api/charters:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH: Update a scenario (status, observations, media_url) or a charter
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { type, scenario_id, charter_id, ...updates } = body;

    if (type === 'scenario' && scenario_id) {
      const { data, error } = await supabase
        .from('qa_charter_scenarios')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', scenario_id)
        .select('*')
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, scenario: data });
    }

    if (type === 'charter' && charter_id) {
      const { data, error } = await supabase
        .from('qa_charters')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', charter_id)
        .select('*')
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, charter: data });
    }

    return NextResponse.json({ error: 'Invalid update payload' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in PATCH /api/charters:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Add a new scenario to a charter or create a new charter
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'create_scenario') {
      const { charter_id, prompt_id, prompt_text, sort_order } = body;
      const { data, error } = await supabase
        .from('qa_charter_scenarios')
        .insert({
          charter_id,
          prompt_id: prompt_id || 'P-NEW',
          prompt_text: prompt_text || 'New exploratory test scenario',
          status: 'Untested',
          observations: '',
          media_url: '',
          sort_order: sort_order ?? 99
        })
        .select('*')
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, scenario: data });
    }

    if (action === 'create_charter') {
      const { feature_id, project_id, charter_code, title, mission, user_persona, starting_condition, expected_outcome, scope } = body;
      const { data, error } = await supabase
        .from('qa_charters')
        .insert({
          feature_id: feature_id || null,
          project_id,
          charter_code: charter_code || 'GH-ET-01',
          title: title || 'Custom Exploratory Charter',
          mission: mission || '',
          user_persona: user_persona || 'Customer',
          starting_condition: starting_condition || 'Home Screen',
          expected_outcome: expected_outcome || 'System performs as expected',
          scope: scope || 'feature',
          status: 'Draft'
        })
        .select('*')
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, charter: { ...data, scenarios: [] } });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in POST /api/charters:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Delete a charter or a scenario
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const scenarioId = searchParams.get('scenario_id');
    const charterId = searchParams.get('charter_id');

    if (scenarioId) {
      const { error } = await supabase.from('qa_charter_scenarios').delete().eq('id', scenarioId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (charterId) {
      await supabase.from('qa_charter_scenarios').delete().eq('charter_id', charterId);
      const { error } = await supabase.from('qa_charters').delete().eq('id', charterId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Missing charter_id or scenario_id' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in DELETE /api/charters:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
