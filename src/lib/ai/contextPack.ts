import { 
  Feature, 
  ScreenItem, 
  JourneyNodeData, 
  JourneyEdgeData, 
  KnowledgeItem, 
  ContextPack, 
  ControlledPersona 
} from '@/lib/types';
import { extractVisualEvidence } from './visionExtractor';

/**
 * Context Pack Builder
 * Assembles a structured, focused context package across all 6 hierarchy levels.
 * Ensures the Charter Generator Agent is grounded in verified product blueprints
 * and visual facts, preventing hallucinations.
 */
export function buildContextPack(
  feature: Feature,
  screens: ScreenItem[],
  nodes: JourneyNodeData[],
  edges: JourneyEdgeData[],
  knowledge: KnowledgeItem[]
): ContextPack {
  const adv = feature.advanced_context || {};

  // Level 1: Feature Scope
  const featureScope = {
    feature: feature.name,
    feature_goal: feature.purpose || feature.description || `Execute ${feature.name} workflow end-to-end`,
    scope: [
      `${feature.name} primary user flow`,
      feature.entry_point ? `Entry via ${feature.entry_point}` : 'App entry point',
      feature.expected_outcome ? `Completion receipt: ${feature.expected_outcome}` : 'Transaction confirmation',
      ...screens.map(s => `Screen #${s.screen_number}: ${s.name || `Step ${s.screen_number}`}`),
      'Validation rules & user input constraints',
      'Failure recovery and network interruptions'
    ]
  };

  // Level 2: Visual Evidence (Visual Truth Layer)
  const visualEvidence = extractVisualEvidence(
    screens, 
    feature.entry_point, 
    feature.expected_outcome
  ).map(ev => ({
    screen_id: ev.screen_id,
    screen_name: ev.screen_name,
    visual_observations: ev.visual_observations
  }));

  // Level 3: Eight Blueprint Dimensions (Targeted Retrieval)
  const confirmedRules = knowledge
    .filter(k => k.confidence === 'CONFIRMED' || k.confidence === 'INFERRED')
    .map(k => `${k.title}: ${k.content}`);

  if (adv.known_business_rules) {
    confirmedRules.push(...adv.known_business_rules.split('\n').filter(Boolean));
  }

  const failureStates: string[] = [
    'Network timeout during transaction execution',
    'Carrier / Provider service downtime or API failure',
    'Session expiration or unexpected app backgrounding',
    'Insufficient funds or balance deduction mismatch',
    'Consecutive authentication / PIN failure lockouts'
  ];
  if (adv.known_edge_cases) {
    failureStates.push(...adv.known_edge_cases.split('\n').filter(Boolean));
  }
  if (adv.known_limitations) {
    failureStates.push(...adv.known_limitations.split('\n').filter(Boolean));
  }

  const dependencies: string[] = [
    feature.platform || 'Mobile OS (Android / iOS)',
    'Payment Gateway & Core Banking Services',
    'Mobile Network Operator (MNO) Telco APIs'
  ];
  if (adv.known_apis) {
    dependencies.push(...adv.known_apis.split('\n').filter(Boolean));
  }
  if (adv.known_dependencies) {
    dependencies.push(...adv.known_dependencies.split('\n').filter(Boolean));
  }

  const interactions: string[] = [];
  screens.forEach(s => {
    (s.ai_analysis?.elements || []).forEach(e => {
      if (e.is_interactive || e.type === 'button') {
        interactions.push(`${e.label} (${e.type} on Screen #${s.screen_number})`);
      }
    });
  });

  const journeysSummary = nodes.length > 0
    ? nodes.map(n => n.label || 'Step').join(' → ')
    : screens.map(s => s.name).join(' → ');

  const blueprintDimensions = {
    features: [feature.name, feature.description || 'Core service'],
    user_types: feature.user_types && feature.user_types.length > 0 
      ? feature.user_types 
      : ['Customer', 'Verified Account Holder'],
    journeys: [journeysSummary],
    interactions: interactions.slice(0, 12),
    business_rules: confirmedRules.length > 0 ? confirmedRules : ['Standard validation rules apply.'],
    failure_states: failureStates,
    dependencies: dependencies,
    historical_risks: [
      'Duplicate charges caused by rapid double-tapping submit buttons',
      'Transaction state dropped when switching between apps or receiving calls',
      'Unclear error feedback when telco network drops mid-request',
      'Phone numbers with international +233 prefixes misparsed by carrier gateway'
    ]
  };

  // Level 4: Controlled Persona
  const primaryUserType = feature.user_types?.[0] || 'Customer';
  const persona: ControlledPersona = {
    type: primaryUserType,
    experience: 'Regular customer performing sensitive financial tasks on a mobile device',
    goal: `Complete ${feature.name} quickly and verify that funds/data are handled safely without loss or ambiguity`,
    conditions: [
      'Operating on variable cellular connection (3G / 4G / Wi-Fi)',
      'Subject to interruptions (incoming phone calls, app switching, low battery)',
      'Highly sensitive to unclear fees, missing confirmation receipts, or duplicate deductions'
    ]
  };

  // Level 5: Risk Profile
  const screenStates = screens.map(s => s.state || 'normal');
  const riskProfile = {
    critical_states: [
      feature.entry_point || 'Initial Entry',
      ...screenStates.filter((v, i, a) => a.indexOf(v) === i),
      'Payment Authorization',
      feature.expected_outcome || 'Receipt State'
    ],
    interruption_points: [
      'Form input before validation',
      'Button tap while async loading spinner is active',
      'PIN / Biometric authentication prompt',
      'Backgrounding app immediately before receipt is displayed'
    ],
    key_risks: [
      'Customer unaware if transaction completed, prompting duplicate transfer attempt',
      'Account debited without receipt confirmation reference number generated',
      'Form inputs cleared when backing up to edit a mistake',
      'Carrier gateway failure reported as generic unhelpful error'
    ]
  };

  // Level 6: Exploration Dimension Matrix (Feature-Specific Prioritization)
  const isPaymentFlow = /payment|transfer|money|airtime|cash|bill|wallet|checkout/i.test(feature.name + ' ' + (feature.purpose || ''));
  
  const explorationDimensions = [
    {
      dimension: 'State Transitions & Timing',
      priority: 'HIGH' as const,
      rationale: 'Verify state integrity between form submission, PIN auth, processing spinners, and final receipt.'
    },
    {
      dimension: 'Network Failure & Recovery',
      priority: 'HIGH' as const,
      rationale: 'Test disconnection mid-spinner, timeout recovery, and duplicate payment prevention.'
    },
    {
      dimension: 'Rapid Double-Tap & Concurrency',
      priority: isPaymentFlow ? ('HIGH' as const) : ('MEDIUM' as const),
      rationale: 'Ensure financial debits cannot be triggered multiple times via rapid button clicks.'
    },
    {
      dimension: 'Navigation & Backtracking',
      priority: 'HIGH' as const,
      rationale: 'Ensure hardware and software back navigation preserves input data without resetting flows.'
    },
    {
      dimension: 'App Lifecycle & Interruption',
      priority: 'HIGH' as const,
      rationale: 'Verify session retention when app is backgrounded, minimized, or interrupted by incoming calls.'
    },
    {
      dimension: 'Boundary & Format Edge Cases',
      priority: 'HIGH' as const,
      rationale: 'Probe carrier prefixes, minimum/maximum limits, decimal cents, and unusual input strings.'
    },
    {
      dimension: 'Visual Integrity & Disclaimers',
      priority: 'MEDIUM' as const,
      rationale: 'Inspect fee breakdowns, disclaimer readability, and layout behavior across device sizes.'
    },
    {
      dimension: 'Dependency Failure Feedback',
      priority: 'MEDIUM' as const,
      rationale: 'Verify clear human-readable feedback when third-party telco or banking APIs fail.'
    }
  ];

  return {
    feature_scope: featureScope,
    visual_evidence: visualEvidence,
    blueprint_dimensions: blueprintDimensions,
    persona: persona,
    risk_profile: riskProfile,
    exploration_dimensions: explorationDimensions
  };
}
