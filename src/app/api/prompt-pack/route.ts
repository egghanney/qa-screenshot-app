import { NextRequest, NextResponse } from 'next/server';
import { getFeatureContextPack } from '@/lib/mcp/engine/aiEngine';
import { 
  buildCompleteChatGptPromptPack, 
  buildSplitChatGptPromptPack 
} from '@/lib/storyboard/chatgptPromptPackGenerator';
import { 
  StoryboardScreen, 
  StoryboardExecutiveContext, 
  ActiveDefectEvidence, 
  QACharter 
} from '@/lib/types';
import { supabase } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const featureParam = (searchParams.get('feature') || searchParams.get('feature_id') || searchParams.get('name') || 'latest').trim();
    const part = (searchParams.get('part') || 'all').toLowerCase();

    const pack = await getFeatureContextPack(featureParam);

    const screens: StoryboardScreen[] = (pack.screens || []).map((s, idx) => ({
      id: s.screen_id || `screen-${idx + 1}`,
      name: s.screen_name || `Screen #${idx + 1}`,
      previewUrl: s.image_url || '',
      isSubScreen: false,
      stepBadge: `#${s.screen_number || idx + 1}`,
      actions: (s.user_actions || []).map((a, aIdx) => ({
        id: `act-${idx + 1}-${aIdx + 1}`,
        order: a.sequence || aIdx + 1,
        type: 'tap' as const,
        description: a.action
      })),
      expectedResult: s.observed_behaviour?.join('; ') || ''
    }));

    // Query recent test runs to extract live defect evidence and media attachments
    const liveDefects: ActiveDefectEvidence[] = [];
    try {
      const { data: testRunsData } = await supabase
        .from('qa_test_runs')
        .select('id, name, created_at, metadata, failed_count, blocked_count')
        .contains('feature_ids', JSON.stringify([pack.feature.id]))
        .order('created_at', { ascending: false })
        .limit(10);

      if (testRunsData && testRunsData.length > 0) {
        const seenScenarios = new Set<string>();

        testRunsData.forEach(run => {
          const chartersSnapshot: QACharter[] = run.metadata?.charters_snapshot || [];
          const scenarioResults = run.metadata?.scenario_results || {};

          // 1. If snapshot of charters exists, extract rich prompt and screen mapping
          if (chartersSnapshot.length > 0) {
            chartersSnapshot.forEach(charter => {
              (charter.scenarios || []).forEach(sc => {
                const res = scenarioResults[sc.id];
                const status = res?.status || sc.status;
                const observations = (res?.observations !== undefined ? res.observations : sc.observations) || '';
                const mediaUrl = (res?.media_url !== undefined ? res.media_url : sc.media_url) || '';
                const executedAt = res?.executed_at;

                if ((status === 'Fail' || status === 'Blocked') && !seenScenarios.has(sc.id)) {
                  seenScenarios.add(sc.id);
                  liveDefects.push({
                    runId: run.id,
                    runName: run.name,
                    scenarioId: sc.id,
                    promptId: sc.prompt_id,
                    status,
                    observations: observations.trim() || 'Tester logged failure without extra notes.',
                    mediaUrl: mediaUrl.trim() || undefined,
                    executedAt: executedAt || run.created_at,
                    screenReference: charter.title || (charter.charter_code ? `Charter ${charter.charter_code}` : undefined)
                  });
                }
              });
            });
          } else if (Object.keys(scenarioResults).length > 0) {
            // 2. Fallback to scenario_results map if no charters_snapshot
            Object.entries(scenarioResults).forEach(([scId, res]: [string, any]) => {
              if (res && (res.status === 'Fail' || res.status === 'Blocked') && !seenScenarios.has(scId)) {
                seenScenarios.add(scId);
                const screenRef = res.charter_title 
                  ? `${res.charter_title}${res.charter_code ? ` (${res.charter_code})` : ''}`
                  : (res.charter_code ? `Charter ${res.charter_code}` : undefined);

                liveDefects.push({
                  runId: run.id,
                  runName: run.name,
                  scenarioId: scId,
                  promptId: res.prompt_id || (scId.startsWith('p-') || scId.startsWith('P-') ? scId : undefined),
                  status: res.status,
                  observations: (res.observations || '').trim() || 'Tester logged failure without extra notes.',
                  mediaUrl: (res.media_url || '').trim() || undefined,
                  executedAt: res.executed_at || run.created_at,
                  screenReference: screenRef
                });
              }
            });
          }
        });
      }
    } catch (defectErr) {
      console.warn('Could not query live defects from qa_test_runs for prompt pack:', defectErr);
    }

    const execContext: StoryboardExecutiveContext = {
      featuresAndServices: pack.feature.goal || pack.framework.features_services?.join(', '),
      userTypes: pack.framework.user_types?.join(', '),
      journeysAndNavigation: pack.framework.journeys_navigation?.join('; '),
      interactionReference: pack.framework.interactions_configuration?.join('; '),
      businessRules: pack.framework.business_rules_constraints?.join('; '),
      systemFailureStates: pack.framework.system_failure_states?.join('; '),
      communicationsDependencies: pack.framework.communications_dependencies?.join('; '),
      historicalKnowledgeRisk: pack.framework.historical_knowledge_risk?.join('; '),
      liveDefects: liveDefects.length > 0 ? liveDefects : undefined
    };

    const flowTitle = pack.feature.name || 'Feature Journey';

    let promptText = '';
    if (part === 'part1') {
      promptText = buildSplitChatGptPromptPack(flowTitle, screens, execContext).part1;
    } else if (part === 'part2') {
      promptText = buildSplitChatGptPromptPack(flowTitle, screens, execContext).part2;
    } else {
      promptText = buildCompleteChatGptPromptPack(flowTitle, screens, execContext);
    }

    return NextResponse.json({
      success: true,
      feature_id: pack.feature.id,
      feature_name: flowTitle,
      total_screens: screens.length,
      active_defects_count: liveDefects.length,
      live_defects: liveDefects,
      part,
      prompt: promptText
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to generate prompt pack'
    }, { 
      status: 404,
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
