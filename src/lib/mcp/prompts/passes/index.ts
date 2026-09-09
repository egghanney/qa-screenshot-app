import { ContextPack } from '../../contracts/schemas';

export interface ResolvedScreenImage {
  screen_id: string;
  screen_number: number;
  screen_name: string;
  image_url?: string;
  mimeType: string;
  base64Data: string;
  dataUrl: string;
}

export type OpenAiContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'high' | 'low' | 'auto' } };

export type GeminiContentPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

/**
 * PASS 1 — UNDERSTAND (Text-only fallback)
 * Synthesizes feature scope, user types, screens, user actions, and blueprint pillars.
 */
export function buildPass1UnderstandPrompt(contextPack: ContextPack): string {
  return `=== PASS 1: UNDERSTAND ===
Analyze the supplied Feature Context, 8 Blueprint Pillars, and Screen Evidence below.

FEATURE:
ID: ${contextPack.feature.id}
Name: ${contextPack.feature.name}
Goal: ${contextPack.feature.goal}
Description: ${contextPack.feature.description || 'N/A'}

THE 8 BLUEPRINT PILLARS:
1. Features & Services:
${JSON.stringify(contextPack.framework.features_services, null, 2)}
2. User Types:
${JSON.stringify(contextPack.framework.user_types, null, 2)}
3. Journeys & Navigation:
${JSON.stringify(contextPack.framework.journeys_navigation, null, 2)}
4. Interaction & Configuration Reference:
${JSON.stringify(contextPack.framework.interactions_configuration, null, 2)}
5. Business Rules & Constraints:
${JSON.stringify(contextPack.framework.business_rules_constraints, null, 2)}
6. System & Failure States:
${JSON.stringify(contextPack.framework.system_failure_states, null, 2)}
7. Communications & Dependencies:
${JSON.stringify(contextPack.framework.communications_dependencies, null, 2)}
8. Historical Knowledge & Risk:
${JSON.stringify(contextPack.framework.historical_knowledge_risk, null, 2)}

SCREEN EVIDENCE & ORDERED USER ACTIONS:
${contextPack.screens.map(s => `
--- Screen #${s.screen_number}: "${s.screen_name}" (ID: ${s.screen_id}) ---
Image URL: ${s.image_url || 'None'}
Ordered User Actions:
${s.user_actions.map(a => `  [Step ${a.sequence}] Action: "${a.action}" | Purpose: "${a.purpose}"`).join('\n') || '  (None recorded)'}
Visible Elements: ${s.visible_elements.join(', ') || 'N/A'}
Observed Behaviour: ${s.observed_behaviour.join(', ') || 'N/A'}
Screen Unknowns: ${s.unknowns.join(', ') || 'None'}
`).join('\n')}

KNOWN UNKNOWNS / OPEN QUESTIONS:
${contextPack.known_unknowns.map(u => `- ${u}`).join('\n') || 'None recorded'}

NORMALIZED EVIDENCE CLASSIFICATIONS:
Confirmed: ${contextPack.evidence_index.confirmed.length} facts
Observed: ${contextPack.evidence_index.observed.length} facts
Inferred: ${contextPack.evidence_index.inferred.length} facts
Unknown: ${contextPack.evidence_index.unknown.length} facts

OUTPUT REQUIREMENT:
Synthesize an understanding summary confirming:
1. Primary feature intent and financial/business value.
2. Verified user personas and preconditions.
3. Screen progression and recorded user action sequences.
4. Critical system boundaries and failure states.
Do not invent unstated requirements. Return clean JSON.`;
}

/**
 * PASS 1 — MULTIMODAL OPENAI CONTENT BLOCKS
 * Interleaves structured context, 8 Blueprint Pillars, and ordered screenshots with actions.
 */
export function buildPass1MultimodalOpenAiBlocks(
  contextPack: ContextPack,
  resolvedImages: ResolvedScreenImage[]
): OpenAiContentBlock[] {
  const blocks: OpenAiContentBlock[] = [];

  const introText = `=== PASS 1: UNDERSTAND (MULTIMODAL STORYBOARD INSPECTION) ===
Analyze the supplied Feature Context, 8 Blueprint Pillars, and Screen Storyboard Evidence below.

FEATURE:
ID: ${contextPack.feature.id}
Name: ${contextPack.feature.name}
Goal: ${contextPack.feature.goal}
Description: ${contextPack.feature.description || 'N/A'}

THE 8 BLUEPRINT PILLARS:
1. Features & Services:
${JSON.stringify(contextPack.framework.features_services, null, 2)}
2. User Types:
${JSON.stringify(contextPack.framework.user_types, null, 2)}
3. Journeys & Navigation:
${JSON.stringify(contextPack.framework.journeys_navigation, null, 2)}
4. Interaction & Configuration Reference:
${JSON.stringify(contextPack.framework.interactions_configuration, null, 2)}
5. Business Rules & Constraints:
${JSON.stringify(contextPack.framework.business_rules_constraints, null, 2)}
6. System & Failure States:
${JSON.stringify(contextPack.framework.system_failure_states, null, 2)}
7. Communications & Dependencies:
${JSON.stringify(contextPack.framework.communications_dependencies, null, 2)}
8. Historical Knowledge & Risk:
${JSON.stringify(contextPack.framework.historical_knowledge_risk, null, 2)}

STORYBOARD SCREEN INSPECTION:
The storyboard screens are presented below in exact sequential order.
For each screen, inspect the actual screenshot directly beneath its metadata and ordered user actions.
Observe visual cues, element alignment, active vs. disabled button states, badge notifications, input formatting, error banners, and microcopy.`;

  blocks.push({ type: 'text', text: introText });

  const resolvedMap = new Map(resolvedImages.map(img => [img.screen_id, img]));

  for (const s of contextPack.screens) {
    const screenIntro = `--- SCREEN #${s.screen_number}: "${s.screen_name}" (ID: ${s.screen_id}) ---
Ordered User Actions on this Screen:
${s.user_actions.map(a => `  [Step ${a.sequence}] Action: "${a.action}" | Purpose: "${a.purpose}"`).join('\n') || '  (None recorded)'}
Visible Elements Recorded: ${s.visible_elements.join(', ') || 'N/A'}
Observed Behaviour: ${s.observed_behaviour.join(', ') || 'N/A'}
Screen Unknowns: ${s.unknowns.join(', ') || 'None'}`;

    blocks.push({ type: 'text', text: screenIntro });

    const resolved = resolvedMap.get(s.screen_id);
    if (resolved && resolved.dataUrl) {
      blocks.push({
        type: 'image_url',
        image_url: {
          url: resolved.dataUrl,
          detail: 'high'
        }
      });
    } else {
      blocks.push({
        type: 'text',
        text: `[IMAGE UNAVAILABLE: Screen #${s.screen_number} "${s.screen_name}" - screenshot image was not resolved from storage. Inspect recorded metadata and actions.]`
      });
    }
  }

  const outroText = `KNOWN UNKNOWNS / OPEN QUESTIONS:
${contextPack.known_unknowns.map(u => `- ${u}`).join('\n') || 'None recorded'}

NORMALIZED EVIDENCE CLASSIFICATIONS:
Confirmed: ${contextPack.evidence_index.confirmed.length} facts
Observed: ${contextPack.evidence_index.observed.length} facts
Inferred: ${contextPack.evidence_index.inferred.length} facts
Unknown: ${contextPack.evidence_index.unknown.length} facts

OUTPUT REQUIREMENT:
Synthesize an understanding summary in clean JSON confirming:
1. Primary feature intent and financial/business value.
2. Verified user personas and preconditions.
3. Sequenced screen progression and recorded user action sequences.
4. Visual layout findings (buttons, alignments, microcopy, visual anomalies observed across screenshots).
5. Critical system boundaries and failure states.
Do not invent unstated requirements. Return clean JSON.`;

  blocks.push({ type: 'text', text: outroText });

  return blocks;
}

/**
 * PASS 1 — MULTIMODAL GEMINI CONTENT PARTS
 * Interleaves text and inlineData base64 parts for Google Gemini models.
 */
export function buildPass1MultimodalGeminiParts(
  contextPack: ContextPack,
  resolvedImages: ResolvedScreenImage[]
): GeminiContentPart[] {
  const parts: GeminiContentPart[] = [];
  const resolvedMap = new Map(resolvedImages.map(img => [img.screen_id, img]));

  parts.push({
    text: `=== PASS 1: UNDERSTAND (MULTIMODAL STORYBOARD INSPECTION) ===
Analyze the supplied Feature Context, 8 Blueprint Pillars, and Screen Storyboard Evidence below.

FEATURE:
ID: ${contextPack.feature.id}
Name: ${contextPack.feature.name}
Goal: ${contextPack.feature.goal}
Description: ${contextPack.feature.description || 'N/A'}

THE 8 BLUEPRINT PILLARS:
1. Features & Services: ${JSON.stringify(contextPack.framework.features_services)}
2. User Types: ${JSON.stringify(contextPack.framework.user_types)}
3. Journeys & Navigation: ${JSON.stringify(contextPack.framework.journeys_navigation)}
4. Interaction & Configuration Reference: ${JSON.stringify(contextPack.framework.interactions_configuration)}
5. Business Rules & Constraints: ${JSON.stringify(contextPack.framework.business_rules_constraints)}
6. System & Failure States: ${JSON.stringify(contextPack.framework.system_failure_states)}
7. Communications & Dependencies: ${JSON.stringify(contextPack.framework.communications_dependencies)}
8. Historical Knowledge & Risk: ${JSON.stringify(contextPack.framework.historical_knowledge_risk)}

STORYBOARD SCREEN INSPECTION:
Sequenced screenshots are provided directly below each screen's ordered user actions. Inspect visual layout, disabled states, microcopy, and button alignments.`
  });

  for (const s of contextPack.screens) {
    const screenText = `--- SCREEN #${s.screen_number}: "${s.screen_name}" (ID: ${s.screen_id}) ---
Ordered User Actions:
${s.user_actions.map(a => `  [Step ${a.sequence}] Action: "${a.action}" | Purpose: "${a.purpose}"`).join('\n') || '  (None recorded)'}
Recorded Elements: ${s.visible_elements.join(', ') || 'N/A'}
Observed Behaviour: ${s.observed_behaviour.join(', ') || 'N/A'}
Unknowns: ${s.unknowns.join(', ') || 'None'}`;

    parts.push({ text: screenText });

    const resolved = resolvedMap.get(s.screen_id);
    if (resolved && resolved.base64Data) {
      parts.push({
        inlineData: {
          mimeType: resolved.mimeType || 'image/png',
          data: resolved.base64Data
        }
      });
    } else {
      parts.push({
        text: `[IMAGE UNAVAILABLE: Screen #${s.screen_number} "${s.screen_name}" - screenshot image was not available]`
      });
    }
  }

  parts.push({
    text: `KNOWN UNKNOWNS / OPEN QUESTIONS:
${contextPack.known_unknowns.map(u => `- ${u}`).join('\n') || 'None'}

OUTPUT REQUIREMENT:
Synthesize an understanding summary in clean JSON confirming:
1. Primary feature intent and financial/business value.
2. Verified user personas and preconditions.
3. Screen progression and recorded user action sequences.
4. Visual layout findings across screenshots.
5. Critical system boundaries and failure states.
Do not invent unstated requirements. Return clean JSON.`
  });

  return parts;
}

/**
 * PASS 2 — ANALYZE
 * Derives topological journeys, state transitions, data consistency paths,
 * sourced risks, and separated coverage models.
 * Retains primary contextPack data alongside Pass 1's understandSummary to prevent dependence drift.
 */
export function buildPass2AnalyzePrompt(contextPack: ContextPack, understandSummary: any): string {
  return `=== PASS 2: ANALYZE ===
Analyze both the primary storyboard context pack and Pass 1's understanding summary below:

FEATURE:
${contextPack.feature.name} (Goal: ${contextPack.feature.goal})

STORYBOARD SCREENS & SEQUENCED USER ACTIONS:
${contextPack.screens.map(s => `Screen #${s.screen_number} "${s.screen_name}": Actions: [${s.user_actions.map(a => `Step ${a.sequence}: ${a.action}`).join(', ') || 'None'}], Visible: [${s.visible_elements.slice(0, 5).join(', ')}], States: [${s.observed_behaviour.join(', ') || 'Default'}]`).join('\n')}

PASS 1 UNDERSTANDING SUMMARY:
${JSON.stringify(understandSummary, null, 2)}

THE 8 BLUEPRINT PILLARS CONTEXT:
- Business Rules: ${JSON.stringify(contextPack.framework.business_rules_constraints)}
- Failure States: ${JSON.stringify(contextPack.framework.system_failure_states)}
- Historical Risks: ${JSON.stringify(contextPack.framework.historical_knowledge_risk)}

DERIVE CORE BEHAVIORAL MODELS:
1. JOURNEY MODEL:
- Start point, user goal, steps, decision points, terminal states.
- Explicit transitions: from, to, trigger, is_failure, is_recovery.

2. STATE & BOUNDARY MODEL:
- States, boundaries, irreversible actions (e.g. money debited, SMS sent).

3. CROSS-SCREEN DATA CONSISTENCY MODEL:
- Identify key entities (e.g. transaction, recipient, fee, balance, reference).
- Track which stages they appear in: input -> confirmation -> processing -> success/failure -> receipt -> history -> notification.

4. SOURCED RISK MODEL:
- Derive risks based on: business impact, user impact, transaction criticality, failure possibilities, data consistency.
- Every risk must have: risk_id, title, severity (Low/Medium/High/Critical), reason, and derived_from sources.

5. SEPARATED COVERAGE MODEL:
- Separate 8 Blueprint Pillars coverage from the 20 Exploration Dimensions.
- Identify explicit coverage gaps.

Return JSON conforming to FeatureAnalysisSchema.`;
}

/**
 * PASS 3 — CHALLENGE (The 10 Explicit Questions)
 * Grounded in primary contextPack ground truth as well as derived analysis.
 */
export function buildPass3ChallengePrompt(analysis: any, contextPack?: ContextPack): string {
  const contextSnippet = contextPack ? `
PRIMARY STORYBOARD GROUND-TRUTH:
Feature: ${contextPack.feature.name}
Screens (${contextPack.screens.length}): ${contextPack.screens.map(s => `#${s.screen_number} ${s.screen_name}`).join(' -> ')}
Known Unknowns (${contextPack.known_unknowns.length}): ${contextPack.known_unknowns.join('; ') || 'None'}
Observed Screen Facts: ${contextPack.evidence_index.observed.length}
Confirmed Facts: ${contextPack.evidence_index.confirmed.length}
` : '';

  return `=== PASS 3: CHALLENGE (10 EXPLICIT AUDIT QUESTIONS) ===${contextSnippet}
Interrogate the derived analysis rigorously against the primary storyboard ground truth.
You must explicitly evaluate and answer each of the following 10 questions:

1. What assumptions did I make?
2. Which assumptions are unsupported by supplied context?
3. What is confirmed vs. what is only observed?
4. What remains genuinely unknown and must NOT be converted to a requirement?
5. Which user actions haven't been explored?
6. Which state transitions haven't been explored?
7. Which failure/recovery paths haven't been explored?
8. Which data entities could become inconsistent across screens?
9. Which important risks have no exploratory coverage yet?
10. Are there any blind spots that require explicit tester investigation?

Filter out unsupported claims and convert unverified behaviors into explicit UNKNOWNS.
Return JSON with challenged findings, verified risk list, and refined exploration vectors.`;
}

/**
 * PASS 4 — GENERATE
 * Generates focused, non-duplicative, risk-based exploratory charters.
 * Storyboard flow and user actions are explicitly provided alongside challenged analysis.
 */
export function buildPass4GeneratePrompt(
  contextPack: ContextPack, 
  challengedAnalysis: any, 
  requestedCount: number = 4
): string {
  return `=== PASS 4: GENERATE EXPLORATORY CHARTERS ===
Feature: ${contextPack.feature.name}
Storyboard Flow: ${contextPack.screens.map(s => `#${s.screen_number} "${s.screen_name}"`).join(' -> ')}
Sequenced Actions:
${contextPack.screens.map(s => `  Screen #${s.screen_number}: ${s.user_actions.map(a => `[${a.sequence}] ${a.action}`).join(' -> ') || 'None'}`).join('\n')}

Generate exactly ${requestedCount} focused exploratory testing charters based on the challenged analysis.

CRITICAL RULES:
1. EXPLORATORY MISSIONS, NOT SCRIPTED RECIPES:
   - Provide clear intent and risk context to guide tester thinking.
   - Do NOT write step-by-step clicks unless necessary to isolate an edge case.
2. 100% PROMPT TRACEABILITY:
   - Every prompt must include 'derived_from' mapping to: features, journeys, interactions, business_rules, failure_states, risks, screens, user_actions.
3. NO DUPLICATE PROMPTS:
   - Ensure every prompt is distinct in purpose and scenario dimension.
4. UNKNOWN INTEGRITY:
   - If an area is unknown, guide the tester to investigate the unknown; do NOT invent how it works.
5. BALANCED COVERAGE:
   - Include Golden Path baseline, state transitions, failure & network interruptions, and data consistency across screens.

Return JSON conforming to CharterSuiteSchema (charters array, metadata). Application assigns IDs.`;
}

/**
 * PASS 5 — VALIDATE (AI Self-Critique)
 */
export function buildPass5ValidatePrompt(charterSuite: any, contextPack: ContextPack): string {
  return `=== PASS 5: AI SELF-CRITIQUE & VALIDATION ===
Review the candidate charter suite against the primary evidence index.

Check:
1. Are any prompts rigid click recipes?
2. Does every prompt have valid source lineage in derived_from?
3. Are there semantic duplicates across charters?
4. Are any claims unsupported by confirmed/observed evidence?
5. Are high-risk areas adequately targeted?

Output refined charter suite and self-critique notes.`;
}

