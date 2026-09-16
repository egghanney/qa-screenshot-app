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
    const traceabilityMap: Record<string, any> = {};
    const errors: string[] = [];

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
        const msg = `Error saving charter ${charterCode}: ${cErr?.message || 'unknown error'}`;
        console.error(msg);
        errors.push(msg);
        continue;
      }
      savedChartersCount++;

      // Support flexible key names from ChatGPT
      const rawScenarios: any[] = Array.isArray(c.scenarios)
        ? c.scenarios
        : Array.isArray(c.exploration_prompts)
        ? c.exploration_prompts
        : Array.isArray(c.prompts)
        ? c.prompts
        : Array.isArray(c.investigative_scenarios)
        ? c.investigative_scenarios
        : Array.isArray(c.scenarios_table)
        ? c.scenarios_table
        : Array.isArray(c.table)
        ? c.table
        : [];

      const scenariosToInsert = rawScenarios
        .map((s: any, sIdx: number) => {
          const promptText = typeof s === 'string'
            ? s.trim()
            : (
                s.prompt_text ||
                s.prompt ||
                s.exploration_prompt ||
                s.scenario ||
                s.text ||
                s.description ||
                s.exploration_prompts_and_investigative_scenarios ||
                s.content ||
                ''
              ).trim();

          const promptId = (typeof s === 'object' && (s.prompt_id || s.id || s.promptId))
            ? String(s.prompt_id || s.id || s.promptId).trim()
            : `${String(i + 1).padStart(2, '0')}-P${String(sIdx + 1).padStart(2, '0')}`;

          // Collect traceability if present
          if (typeof s === 'object' && s.traceability) {
            traceabilityMap[promptId] = s.traceability;
          } else if (c.traceability) {
            traceabilityMap[promptId] = c.traceability;
          }

          if (!promptText) return null;

          return {
            charter_id: inserted.id,
            prompt_id: promptId,
            prompt_text: promptText,
            status: (typeof s === 'object' && s.status) ? s.status : 'Untested',
            observations: (typeof s === 'object' && s.observations) ? s.observations : '',
            media_url: (typeof s === 'object' && s.media_url) ? s.media_url : '',
            sort_order: sIdx
          };
        })
        .filter((s): s is {
          charter_id: any;
          prompt_id: string;
          prompt_text: string;
          status: string;
          observations: string;
          media_url: string;
          sort_order: number;
        } => s !== null);

      if (scenariosToInsert.length > 0) {
        const { error: sErr } = await supabase
          .from('qa_charter_scenarios')
          .insert(scenariosToInsert);

        if (!sErr) {
          savedScenariosCount += scenariosToInsert.length;
        } else {
          const sMsg = `Error saving scenarios for ${charterCode}: ${sErr.message}`;
          console.error(sMsg);
          errors.push(sMsg);
        }
      }
    }

    // 4. Update feature metadata and traceability map in advanced_context
    const existingAdvancedContext = (feature.advanced_context as any) || {};
    await supabase
      .from('qa_features')
      .update({
        updated_at: new Date().toISOString(),
        advanced_context: {
          ...existingAdvancedContext,
          latest_traceability_map: {
            ...(existingAdvancedContext.latest_traceability_map || {}),
            ...traceabilityMap
          },
          last_synced_from_gpt: new Date().toISOString()
        }
      })
      .eq('id', resolvedId);

    return NextResponse.json({
      success: errors.length === 0,
      feature_id: resolvedId,
      feature_name: feature.name,
      charters_saved: savedChartersCount,
      scenarios_saved: savedScenariosCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully synced ${savedChartersCount} charters and ${savedScenariosCount} scenarios to QA Studio for "${feature.name}".`
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
