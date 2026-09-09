import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase/client';
import { generateChartersForFeature } from '@/lib/mcp/engine/aiEngine';
import { QACharter, CharterScenario } from '@/lib/types';

export const dynamic = 'force-dynamic';

const GenerateChartersRequestSchema = z.object({
  feature_id: z.string().min(1, 'feature_id is required'),
  count: z.number().int().positive().default(4),
  multimodal: z.boolean().default(false),
  project_id: z.string().optional(),
  api_key: z.string().optional(),
  model: z.string().optional()
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parseResult = GenerateChartersRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ 
        error: 'Invalid request payload', 
        details: parseResult.error.format() 
      }, { status: 400 });
    }

    const { feature_id, api_key, count, model, multimodal } = parseResult.data;
    const reqId = `req-${Date.now().toString(36)}`;
    console.log(`[charter-generate] id=${reqId} feature_id=${feature_id} count=${count} multimodal=${multimodal}`);

    const targetFeatureId = feature_id;

    // 1. Invoke the AI Engine Orchestration Service directly in-process
    const { 
      charterSuite, 
      qualityGateReport, 
      contextPack, 
      engine 
    } = await generateChartersForFeature(targetFeatureId, {
      count,
      multimodal,
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

    const conciseMetadata = {
      ...charterSuite.generation_metadata,
      screenshots_requested: charterSuite.generation_metadata.screenshots_requested.length,
      screenshots_analyzed: charterSuite.generation_metadata.screenshots_used.length,
      screenshots_unavailable: charterSuite.generation_metadata.screenshots_unavailable.length,
      screenshots_used: charterSuite.generation_metadata.screenshots_used.length
    };

    const screenshotCoverageSummary = {
      total_screenshots: contextPack.screens.length,
      screenshots_requested: charterSuite.generation_metadata.screenshots_requested.length,
      screenshots_analyzed: charterSuite.generation_metadata.screenshots_used.length,
      screenshots_unavailable: charterSuite.generation_metadata.screenshots_unavailable.length,
      coverage_score: charterSuite.generation_metadata.multimodal_enabled ? 100 : (contextPack.screens.length === 0 ? 100 : 0),
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
      generation_metadata: conciseMetadata,
      screenshot_coverage_summary: screenshotCoverageSummary,
      charters: savedCharters
    });
  } catch (err: any) {
    console.error('Error in /api/charters/generate:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
