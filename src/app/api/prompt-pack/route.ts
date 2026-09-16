import { NextRequest, NextResponse } from 'next/server';
import { getFeatureContextPack } from '@/lib/mcp/engine/aiEngine';
import { 
  buildCompleteChatGptPromptPack, 
  buildSplitChatGptPromptPack 
} from '@/lib/storyboard/chatgptPromptPackGenerator';
import { StoryboardScreen, StoryboardExecutiveContext } from '@/lib/types';

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

    const execContext: StoryboardExecutiveContext = {
      featuresAndServices: pack.feature.goal || pack.framework.features_services?.join(', '),
      userTypes: pack.framework.user_types?.join(', '),
      journeysAndNavigation: pack.framework.journeys_navigation?.join('; '),
      interactionReference: pack.framework.interactions_configuration?.join('; '),
      businessRules: pack.framework.business_rules_constraints?.join('; '),
      systemFailureStates: pack.framework.system_failure_states?.join('; '),
      communicationsDependencies: pack.framework.communications_dependencies?.join('; '),
      historicalKnowledgeRisk: pack.framework.historical_knowledge_risk?.join('; ')
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
