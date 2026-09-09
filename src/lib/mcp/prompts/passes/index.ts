import { ContextPack } from '../../contracts/schemas';

/**
 * PASS 1 — UNDERSTAND
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
 * PASS 2 — ANALYZE
 * Derives topological journeys, state transitions, data consistency paths,
 * sourced risks, and separated coverage models.
 */
export function buildPass2AnalyzePrompt(contextPack: ContextPack, understandSummary: any): string {
  return `=== PASS 2: ANALYZE ===
Based on Pass 1 Understanding, derive the core behavioral models:

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
 */
export function buildPass3ChallengePrompt(analysis: any): string {
  return `=== PASS 3: CHALLENGE (10 EXPLICIT AUDIT QUESTIONS) ===
Interrogate the derived analysis rigorously. You must explicitly evaluate and answer each of the following 10 questions:

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
 */
export function buildPass4GeneratePrompt(
  contextPack: ContextPack, 
  challengedAnalysis: any, 
  requestedCount: number = 4
): string {
  return `=== PASS 4: GENERATE EXPLORATORY CHARTERS ===
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
