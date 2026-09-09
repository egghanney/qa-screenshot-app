import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { generateChartersForFeature } from '@/lib/mcp/engine/aiEngine';
import { QACharter, CharterScenario } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { feature_id, project_id, api_key, count, model } = body;

    if (!feature_id && !project_id) {
      return NextResponse.json({ error: 'feature_id is required' }, { status: 400 });
    }

    const targetFeatureId = feature_id;

    // 1. Invoke the AI Engine Orchestration Service directly in-process
    const { 
      charterSuite, 
      qualityGateReport, 
      contextPack, 
      engine 
    } = await generateChartersForFeature(targetFeatureId, {
      count: count || 4,
      apiKey: api_key,
      model,
      forceRegenerate: true
    });

    // 2. Query saved charters with their scenarios
    const { data: dbCharters, error: fetchErr } = await supabase
      .from('qa_charters')
      .select('*, qa_charter_scenarios(*)')
      .eq('feature_id', targetFeatureId)
      .order('created_at', { ascending: true });

    if (fetchErr) {
      console.error('Error querying saved charters:', fetchErr);
    }

    // 3. Format charters for UI consumption
    const savedCharters: QACharter[] = (dbCharters || []).map((c, idx) => {
      const correspondingCharter = charterSuite.charters[idx] || charterSuite.charters.find(ch => ch.title === c.title);
      const rawScenarios = c.qa_charter_scenarios || [];

      // Sort scenarios by sort_order
      rawScenarios.sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

      const formattedScenarios: CharterScenario[] = rawScenarios.map((s: any, sIdx: number) => {
        const correspondingPrompt = correspondingCharter?.exploration_prompts?.[sIdx] 
          || correspondingCharter?.exploration_prompts?.find(p => p.id === s.prompt_id);

        return {
          id: s.id,
          charter_id: s.charter_id,
          prompt_id: s.prompt_id,
          prompt_text: s.prompt_text,
          status: s.status || 'Untested',
          observations: s.observations || '',
          media_url: s.media_url || '',
          sort_order: s.sort_order ?? sIdx,
          category: correspondingPrompt?.category as any || (s.prompt_id.startsWith('01-') ? 'Golden Path' : 'Boundary & Edge'),
          traceability: correspondingPrompt ? {
            derived_from: {
              feature: correspondingPrompt.derived_from.features,
              journey: correspondingPrompt.derived_from.journeys,
              interaction: correspondingPrompt.derived_from.interactions,
              failure_state: correspondingPrompt.derived_from.failure_states,
              risk: correspondingPrompt.derived_from.risks
            },
            exploration_dimensions: correspondingCharter?.coverage.exploration_dimensions || []
          } : undefined
        };
      });

      return {
        id: c.id,
        feature_id: c.feature_id,
        project_id: c.project_id,
        charter_code: c.charter_code,
        title: c.title,
        mission: c.mission,
        user_persona: c.user_persona,
        starting_condition: c.starting_condition,
        expected_outcome: c.expected_outcome,
        scope: c.scope || 'feature',
        status: c.status || 'Draft',
        scenarios: formattedScenarios,
        created_at: c.created_at,
        updated_at: c.updated_at
      };
    });

    const screenshotCoverageSummary = {
      total_screenshots: contextPack.screens.length,
      screenshots_analyzed: charterSuite.generation_metadata.screenshots_used,
      coverage_score: 100,
      screens: contextPack.screens.map(s => ({
        number: s.screen_number,
        name: s.screen_name,
        actions_count: s.user_actions?.length || 0,
        has_screenshot: !!s.image_url
      }))
    };

    const qualityGateSummary = {
      passed: qualityGateReport.valid,
      score: qualityGateReport.quality_score,
      rating: qualityGateReport.rating,
      checks_passed: Object.values(qualityGateReport.checks).filter((c: any) => c.passed).length,
      total_checks: Object.keys(qualityGateReport.checks).length,
      checks: qualityGateReport.checks
    };

    return NextResponse.json({
      success: true,
      feature_id: targetFeatureId,
      feature_name: contextPack.feature.name,
      engine,
      quality_gate: qualityGateSummary,
      validation_report: qualityGateSummary,
      generation_metadata: charterSuite.generation_metadata,
      screenshot_coverage_summary: screenshotCoverageSummary,
      charters: savedCharters
    });
  } catch (err: any) {
    console.error('Error in /api/charters/generate:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
