import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { generateExploratoryCharters } from '@/lib/ai/service';
import { 
  Feature, 
  ScreenItem, 
  JourneyNodeData, 
  JourneyEdgeData, 
  KnowledgeItem,
  QACharter
} from '@/lib/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { feature_id, project_id, api_key } = body;

    if (!feature_id && !project_id) {
      return NextResponse.json({ error: 'feature_id or project_id is required' }, { status: 400 });
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

    // 2. Fetch screens, nodes, edges, knowledge
    const [screensRes, nodesRes, edgesRes, knowledgeRes] = await Promise.all([
      supabase.from('qa_screens').select('*').eq('feature_id', feature_id).order('screen_number', { ascending: true }),
      supabase.from('qa_journey_nodes').select('*').eq('feature_id', feature_id),
      supabase.from('qa_journey_edges').select('*').eq('feature_id', feature_id),
      supabase.from('qa_knowledge_items').select('*').eq('feature_id', feature_id)
    ]);

    const screens = (screensRes.data || []) as ScreenItem[];
    const nodes = (nodesRes.data || []) as JourneyNodeData[];
    const edges = (edgesRes.data || []) as JourneyEdgeData[];
    const knowledge = (knowledgeRes.data || []) as KnowledgeItem[];

    // 3. Generate Charters via AI / Deterministic synthesis
    const result = await generateExploratoryCharters(
      feature,
      screens,
      nodes,
      edges,
      knowledge,
      api_key
    );

    const rawCharters = result.charters;
    const engineUsed = result.engine;

    // 4. Persist Context Pack and Traceability Map into qa_features.advanced_context
    const traceabilityMap: Record<string, any> = {};
    rawCharters.forEach(c => {
      c.scenarios.forEach(s => {
        if (s.traceability) {
          traceabilityMap[s.prompt_id] = s.traceability;
        }
      });
    });

    const updatedAdvancedContext = {
      ...(feature.advanced_context || {}),
      latest_context_pack: result.context_pack,
      latest_validation_report: result.validation_report,
      latest_traceability_map: traceabilityMap
    };

    await supabase
      .from('qa_features')
      .update({ advanced_context: updatedAdvancedContext })
      .eq('id', feature_id);

    // 5. Persist to Supabase qa_charters & qa_charter_scenarios
    // Delete previous charters for this feature to prevent duplicates on regenerate
    const { data: existingCharters } = await supabase
      .from('qa_charters')
      .select('id')
      .eq('feature_id', feature_id);

    if (existingCharters && existingCharters.length > 0) {
      const ids = existingCharters.map(c => c.id);
      await supabase.from('qa_charter_scenarios').delete().in('charter_id', ids);
      await supabase.from('qa_charters').delete().eq('feature_id', feature_id);
    }

    const savedCharters: QACharter[] = [];

    for (const charter of rawCharters) {
      const { scenarios } = charter;
      const { data: insertedCharter, error: cErr } = await supabase
        .from('qa_charters')
        .insert({
          charter_code: charter.charter_code,
          title: charter.title,
          mission: charter.mission,
          user_persona: charter.user_persona,
          starting_condition: charter.starting_condition,
          expected_outcome: charter.expected_outcome,
          scope: charter.scope || 'feature',
          status: charter.status || 'Draft',
          feature_id: feature.id,
          project_id: feature.project_id
        })
        .select('*')
        .single();

      if (cErr || !insertedCharter) {
        console.error('Error inserting charter:', cErr);
        continue;
      }

      let insertedScenarios: any[] = [];
      if (scenarios && scenarios.length > 0) {
        const scenariosToInsert = scenarios.map((s, idx) => ({
          charter_id: insertedCharter.id,
          prompt_id: s.prompt_id,
          prompt_text: s.prompt_text,
          status: s.status || 'Untested',
          observations: s.observations || '',
          media_url: s.media_url || '',
          sort_order: s.sort_order ?? idx
        }));

        const { data: sData, error: sErr } = await supabase
          .from('qa_charter_scenarios')
          .insert(scenariosToInsert)
          .select('*')
          .order('sort_order', { ascending: true });

        if (sErr) {
          console.error('Error inserting charter scenarios:', sErr);
        } else {
          insertedScenarios = (sData || []).map((dbS, idx) => ({
            ...dbS,
            traceability: scenarios[idx]?.traceability || traceabilityMap[dbS.prompt_id]
          }));
        }
      }

      savedCharters.push({
        ...insertedCharter,
        context_pack: result.context_pack,
        validation_report: result.validation_report,
        scenarios: insertedScenarios
      });
    }

    return NextResponse.json({
      success: true,
      charters: savedCharters,
      engine: engineUsed,
      context_pack: result.context_pack,
      validation_report: result.validation_report
    });
  } catch (err: any) {
    console.error('Error in /api/charters/generate:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
