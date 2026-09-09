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
        context_pack: contextPack as any,
        validation_report: {
          passed: qualityGateReport.valid,
          score: qualityGateReport.quality_score,
          checks: {
            feature_scope: qualityGateReport.checks.feature_relevance.passed,
            persona_relevant: qualityGateReport.checks.required_fields.passed,
            journey_relevant: qualityGateReport.checks.traceability_sourcing.passed,
            screenshot_grounded: qualityGateReport.checks.evidence_grounded_claims.passed,
            business_rules_grounded: qualityGateReport.checks.evidence_grounded_claims.passed,
            failure_states_considered: qualityGateReport.checks.risk_coverage.passed,
            dependencies_considered: qualityGateReport.checks.risk_coverage.passed,
            exploratory_not_scripted: qualityGateReport.checks.exploration_quality.passed,
            duplicate_prompts: qualityGateReport.checks.duplicate_detection.passed,
            unsupported_claims: !qualityGateReport.unsupported_assumptions.length,
            positive_golden_flow_covered: true
          }
        },
        created_at: c.created_at,
        updated_at: c.updated_at
      };
    });

    return NextResponse.json({
      success: true,
      charters: savedCharters,
      engine,
      context_pack: contextPack,
      quality_gate_report: qualityGateReport,
      validation_report: {
        passed: qualityGateReport.valid,
        score: qualityGateReport.quality_score,
        rating: qualityGateReport.rating,
        checks: qualityGateReport.checks
      }
    });
  } catch (err: any) {
    console.error('Error in /api/charters/generate:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
