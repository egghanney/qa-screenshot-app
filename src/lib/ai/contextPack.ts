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

  // Deduplicate and categorize interactions across screens
  const seenInteractions = new Set<string>();
  const interactions: string[] = [];

  screens.forEach(s => {
    (s.ai_analysis?.elements || []).forEach(e => {
      if (e.is_interactive || e.type === 'button') {
        const rawLabel = (e.label || '').trim();
        if (!rawLabel) return;
        const normalized = rawLabel.replace(/\s+/g, ' ');
        const key = `${normalized.toLowerCase()}_${e.type || 'control'}`;
        if (!seenInteractions.has(key)) {
          seenInteractions.add(key);
          const typeStr = e.type ? ` (${e.type})` : '';
          interactions.push(`${normalized}${typeStr}`);
        }
      }
    });
  });

  if (interactions.length === 0) {
    interactions.push('Primary Submit Button (button)', 'Recipient Input Field (text_field)', 'Confirmation Modal (modal)');
  }

  // Extract true topological journeys from DAG (1:1 sync with Visual Journey Canvas)
  const journeys = extractJourneysFromDAG(nodes, edges, screens, feature.name);

  const blueprintDimensions = {
    features: [feature.name, feature.description || 'Core service'],
    user_types: feature.user_types && feature.user_types.length > 0 
      ? feature.user_types 
      : ['Customer', 'Verified Account Holder'],
    journeys: journeys,
    interactions: interactions.slice(0, 16),
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
      dimension: 'Core Journey & Golden Flow',
      priority: 'HIGH' as const,
      rationale: 'Verify the complete, uninterrupted end-to-end success path from entry point to receipt with normal, valid inputs.'
    },
    {
      dimension: 'Alternative Paths & Presets',
      priority: 'HIGH' as const,
      rationale: 'Test quick-path options including preset amount chips, contact shortcuts, payment method switching, and pre-confirmation editing.'
    },
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

/**
 * Traces the topological paths through the User Journey DAG.
 * Guarantees 1:1 synchronization with the visual Journey Map canvas (Left-to-Right layout).
 */
export function extractJourneysFromDAG(
  nodes: JourneyNodeData[],
  edges: JourneyEdgeData[],
  screens: ScreenItem[],
  featureName?: string
): string[] {
  if (!nodes || nodes.length === 0) {
    if (screens && screens.length > 0) {
      const sortedScreens = [...screens].sort((a, b) => (a.screen_number || 0) - (b.screen_number || 0));
      const steps = sortedScreens.map(s => (s.name || `Screen #${s.screen_number}`).trim()).filter(Boolean);
      return steps.length > 0 ? [steps.join(' → ')] : [`${featureName || 'Primary'} User Flow`];
    }
    return [`${featureName || 'Primary'} User Flow`];
  }

  // If no edges exist, sort nodes strictly by canvas position (position_x ascending, position_y ascending)
  if (!edges || edges.length === 0) {
    const sortedNodes = [...nodes].sort((a, b) => {
      if (a.position_x !== b.position_x) return a.position_x - b.position_x;
      return a.position_y - b.position_y;
    });
    const labels = sortedNodes.map(n => (n.label || '').trim()).filter(Boolean);
    const deduped: string[] = [];
    labels.forEach(l => {
      if (deduped.length === 0 || deduped[deduped.length - 1] !== l) deduped.push(l);
    });
    return deduped.length > 0 ? [deduped.join(' → ')] : [`${featureName || 'Primary'} User Flow`];
  }

  const nodeMap = new Map<string, JourneyNodeData>();
  nodes.forEach(n => nodeMap.set(n.id, n));

  const outgoing = new Map<string, JourneyEdgeData[]>();
  const inDegree = new Map<string, number>();

  nodes.forEach(n => {
    outgoing.set(n.id, []);
    inDegree.set(n.id, 0);
  });

  const validEdges = edges.filter(e => nodeMap.has(e.source_node_id) && nodeMap.has(e.target_node_id));

  validEdges.forEach(e => {
    outgoing.get(e.source_node_id)!.push(e);
    inDegree.set(e.target_node_id, (inDegree.get(e.target_node_id) || 0) + 1);
  });

  // Find root entry node: prefer type === 'entry', then inDegree === 0, then lowest position_x
  let startNode: JourneyNodeData | undefined = nodes.find(n => n.type === 'entry');
  if (!startNode) {
    const zeroIn = nodes.filter(n => (inDegree.get(n.id) || 0) === 0 && (outgoing.get(n.id)?.length || 0) > 0);
    if (zeroIn.length > 0) {
      zeroIn.sort((a, b) => a.position_x - b.position_x);
      startNode = zeroIn[0];
    }
  }
  if (!startNode) {
    const sorted = [...nodes].sort((a, b) => a.position_x - b.position_x);
    startNode = sorted[0];
  }

  const paths: string[] = [];
  const goldenEdgesUsed = new Set<string>();

  // 1. Trace Primary Golden Path
  if (startNode) {
    const goldenSteps: string[] = [];
    const visited = new Set<string>();
    let curr: JourneyNodeData | undefined = startNode;

    while (curr && !visited.has(curr.id)) {
      visited.add(curr.id);
      const label = (curr.label || '').trim();
      if (label && (goldenSteps.length === 0 || goldenSteps[goldenSteps.length - 1] !== label)) {
        goldenSteps.push(label);
      }

      if (curr.type === 'exit') break;

      const outEdges = outgoing.get(curr.id) || [];
      const unvisitedEdges = outEdges.filter(e => !visited.has(e.target_node_id));
      if (unvisitedEdges.length === 0) break;

      // Score edges: success > default > screen/exit target > largest position_x
      unvisitedEdges.sort((a, b) => {
        const score = (edge: JourneyEdgeData) => {
          const target = nodeMap.get(edge.target_node_id);
          let val = 0;
          if (edge.edge_type === 'success') val += 100;
          else if (edge.edge_type === 'default') val += 50;
          else if (edge.edge_type === 'recovery') val += 10;
          else if (edge.edge_type === 'failure') val -= 50;

          if (target?.type === 'exit') val += 30;
          else if (target?.type === 'screen') val += 20;
          else if (target?.type === 'error_state') val -= 40;

          return val;
        };
        return score(b) - score(a);
      });

      const chosenEdge = unvisitedEdges[0];
      goldenEdgesUsed.add(chosenEdge.id);
      curr = nodeMap.get(chosenEdge.target_node_id);
    }

    if (goldenSteps.length > 0) {
      paths.push(`[Golden Path] ${goldenSteps.join(' → ')}`);
    }
  }

  // 2. Trace Alternative / Failure & Recovery Branches
  const remainingEdges = validEdges.filter(e => !goldenEdgesUsed.has(e.id));
  
  // Prioritize failure, recovery, and decision alternative branches
  remainingEdges.sort((a, b) => {
    const score = (edge: JourneyEdgeData) => {
      let val = 0;
      if (edge.edge_type === 'failure') val += 100;
      else if (edge.edge_type === 'recovery') val += 80;
      else if (edge.edge_type === 'loop') val += 60;
      const target = nodeMap.get(edge.target_node_id);
      if (target?.type === 'error_state') val += 50;
      if (target?.type === 'decision') val += 30;
      return val;
    };
    return score(b) - score(a);
  });

  const branchVisited = new Set<string>();

  for (const edge of remainingEdges) {
    if (paths.length >= 4) break; // Limit to 3-4 paths max
    const sourceNode = nodeMap.get(edge.source_node_id);
    const targetNode = nodeMap.get(edge.target_node_id);
    if (!sourceNode || !targetNode) continue;

    const branchKey = `${sourceNode.id}->${targetNode.id}`;
    if (branchVisited.has(branchKey)) continue;
    branchVisited.add(branchKey);

    const branchSteps: string[] = [sourceNode.label.trim(), targetNode.label.trim()].filter(Boolean);
    const visitedInBranch = new Set<string>([sourceNode.id, targetNode.id]);
    let branchCurr: JourneyNodeData | undefined = targetNode;

    // Follow branch 1-3 steps further
    for (let stepCount = 0; stepCount < 3; stepCount++) {
      if (!branchCurr || branchCurr.type === 'exit') break;
      const out = (outgoing.get(branchCurr.id) || []).filter(e => !visitedInBranch.has(e.target_node_id));
      if (out.length === 0) break;
      
      const nextEdge = out[0];
      const nextNode = nodeMap.get(nextEdge.target_node_id);
      if (!nextNode) break;

      visitedInBranch.add(nextNode.id);
      const lbl = nextNode.label.trim();
      if (lbl && branchSteps[branchSteps.length - 1] !== lbl) {
        branchSteps.push(lbl);
      }
      branchCurr = nextNode;
    }

    if (branchSteps.length >= 2) {
      let tag = '[Alternative Flow]';
      if (edge.edge_type === 'failure' || targetNode.type === 'error_state') {
        tag = '[Failure & Recovery]';
      } else if (edge.edge_type === 'recovery' || edge.edge_type === 'loop') {
        tag = '[Recovery Loop]';
      }
      paths.push(`${tag} ${branchSteps.join(' → ')}`);
    }
  }

  return paths.length > 0 ? paths : [`${featureName || 'Primary'} User Flow`];
}

