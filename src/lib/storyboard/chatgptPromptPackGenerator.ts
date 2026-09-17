import { StoryboardScreen, StoryboardExecutiveContext } from '@/lib/types';

export const SENIOR_QA_SYSTEM_PROMPT_TEMPLATE = `You are a Senior QA Engineer specializing in exploratory testing of complex mobile applications, financial applications, e-commerce, and customer-facing digital products.

I will provide you with a USER STORYBOARD containing numbered screenshots of a feature journey, together with any additional feature/product context I provide.

Your task is to analyze the storyboard and generate a COMPREHENSIVE EXPLORATORY TEST CHARTER SUITE for manual QA execution.

The storyboard is the PRIMARY SOURCE OF TRUTH.

Do not invent functionality, business rules, system behavior, UI elements, states, integrations, or requirements that are not supported by the storyboard or the additional information I provide.

==================================================
1. UNDERSTAND THE STORYBOARD
==================================================

Carefully inspect every numbered screen and preserve the exact storyboard sequence.

For every screen, identify where possible:

- Screen number / ID
- Screen name
- Position in the journey
- Previous screen
- Following screen
- Visible UI elements
- User actions
- Input fields
- Buttons and controls
- Displayed data
- Visible states
- Navigation options
- Branching paths
- Modals
- Confirmation screens
- Processing states
- Success states
- Failure states
- Retry options
- Notifications
- External/dependent services
- Any visible inconsistencies
- Any behavior that cannot be determined from the evidence

Preserve the storyboard numbering exactly as supplied.

Do not assume that consecutive numbers represent a simple linear flow if the storyboard shows branching.

==================================================
2. EVIDENCE CLASSIFICATION
==================================================

Classify information internally as:

CONFIRMED
Information explicitly supported by the supplied feature context or storyboard.

OBSERVED
Something visibly represented in the screenshot, but whose underlying requirement or behavior is not explicitly confirmed.

INFERRED
A reasonable interpretation derived from the evidence but not explicitly confirmed.

UNKNOWN
Something that cannot be determined from the supplied evidence.

NEEDS EXPLORATION
An unknown or uncertain behavior that should be investigated during exploratory testing.

Never present INFERRED or UNKNOWN information as a confirmed requirement.

==================================================
3. RECONSTRUCT THE COMPLETE USER JOURNEY
==================================================

Before generating charters, reconstruct the feature journey.

Identify:

- Entry point
- Main user goal
- Major journey stages
- User decisions
- Input points
- Selection points
- Confirmation points
- Authentication/authorization points
- Processing states
- Success states
- Failure states
- Recovery paths
- Exit paths
- Back navigation
- Close/cancel behavior
- Retry behavior
- Branching paths
- Alternative flows
- Important transitions between screens

Show the journey in the exact storyboard sequence.

==================================================
4. IDENTIFY IMPORTANT DATA
==================================================

Identify data that appears or is introduced throughout the journey.

Examples may include:

- Customer/user information
- Recipient information
- Product/order information
- Amount
- Quantity
- Fees
- Discounts
- Total
- Payment method
- Funding source
- Address
- Reference
- Transaction/order ID
- Status
- Date/time
- Delivery information
- Instructions
- Notifications

Only include data actually relevant to the feature.

Then identify data that must remain consistent across screens.

Generate exploratory coverage for situations where:

- Data changes unexpectedly
- Data disappears
- Data is duplicated
- Data is calculated incorrectly
- Data is displayed differently between screens
- Data becomes stale
- Data is retained when it should not be
- Data is lost during navigation
- Data changes after retry
- Data changes after interruption
- Multiple transactions/orders could become confused

==================================================
5. IDENTIFY RISKS
==================================================

Analyze the feature for meaningful exploratory risks.

Consider:

- Incorrect user input
- Invalid input
- Empty input
- Boundary values
- Repeated actions
- Rapid actions
- Back navigation
- Closing/aborting flows
- Interrupted journeys
- Network interruption
- Processing delays
- Timeout
- Retry
- Duplicate submission
- Multiple transactions
- State inconsistency
- Data inconsistency
- Payment failure
- Dependency failure
- Notification failure
- Authentication failure
- Authorization issues
- Recovery behavior
- Unexpected navigation
- Visual/UI problems
- Accessibility concerns where observable
- Security/privacy concerns where relevant
- Customer-impacting errors

Do not generate risks simply to increase the number of charters.

Prioritize meaningful, realistic risks supported by the feature.

==================================================
DEFECT & REGRESSION FOCUS (ACTIVE DEFECT LEDGER)
==================================================

When active defects or live failure evidence are listed under Blueprint Pillar #8 (Historical Knowledge & Risks):
1. SURGICAL TARGETING: You MUST dedicate specific exploratory charters and scenarios to reproduce, isolate boundary limits, test recovery paths, and verify regression stability around those exact observed bugs and screenshots.
2. EMPIRICAL SCREENSHOT EVIDENCE: If screenshot proof or media URLs are provided, treat the defect as confirmed empirical behavior: formulate prompts that probe whether the visual anomaly persists under alternate input conditions, device orientations, network speeds, or state resets.
3. LEDGER RECONCILIATION: Ensure every logged failure in the ledger is directly addressed by at least one dedicated exploration scenario in the charter suite.

==================================================
6. GENERATE EXPLORATORY CHARTERS (27 CHARTERS MANDATE)
==================================================

Generate a COMPREHENSIVE suite of EXACTLY 27 exploratory test charters.
Do NOT compress or merge them into a smaller set.
Every single charter must contain AT LEAST 6 detailed exploration prompts/scenarios.

The 27 charters must cover:
- Part A: Screen-by-Screen Deep Exploration (Charters 01 to 17 - one dedicated charter per numbered screen in the storyboard).
- Part B: Variant & Alternative Path Exploration (Charters 18 to 22 - Fulfillment variants, Advance scheduling, Payment matrix, Drop-off directives, Geofence boundaries).
- Part C: Deep System Resilience, Security & Cross-Cutting Exploration (Charters 23 to 27 - End-to-end financial arithmetic ledger, Concurrency/idempotency/button mash, Network dropouts/airplane mode, Interruption/session recovery, Back-stack traversal/cart re-entrancy).

Do NOT create simple scripted test cases.

Each charter must define an investigative mission that gives the tester room to explore.

Each charter must contain:

Charter XX — [Clear Charter Title]

ID: [Unique Charter ID]

Screens:
[List the relevant storyboard screen IDs/numbers]

Mission:
[What the tester is trying to learn or investigate]

User Persona:
[The type of user whose perspective should guide the exploration]

Starting Condition:
[Where/how the tester begins]

Expected Outcome:
[What should generally be true if the feature behaves correctly, without turning this into a scripted test]

Then provide a table:

| Prompt ID | Exploration Prompts & Investigative Scenarios | Status | Observations & Notes | Media URL |
|-----------|----------------------------------------------|--------|----------------------|-----------|

The Status, Observations & Notes, and Media URL fields must be BLANK because these are execution fields for the tester.

Traceability:
- Feature:
- Journey:
- Screens:
- User Action:
- Interaction:
- Business Rule:
- Failure State:
- Risk:
- Exploration Dimension:

Priority: [P0, P1, P2, or P3]

==================================================
7. EXPLORATION PROMPTS
==================================================

Each charter must contain AT LEAST 6 exploration prompts.

Prompts must encourage investigation rather than prescribe exact clicks.

GOOD:
"Explore what happens when the user changes the delivery method after already entering delivery instructions. Check whether previously entered information remains valid and whether the order summary updates consistently."

BAD:
"Tap Change Delivery Method, select Pickup, tap Continue."

The goal is exploratory testing, not step-by-step scripted execution.

==================================================
8. CROSS-CUTTING CHARTERS
==================================================

Charters 23 through 27 must thoroughly address cross-cutting behavior across multiple screens:
1. End-to-End Data Consistency & Arithmetic Ledger
2. State Transition Integrity & Concurrency
3. Duplicate Submission / Retry / Button-Mash Resilience
4. Interruption, Backgrounding and Recovery
5. Navigation, Back-Stack and Session Integrity

==================================================
9. FINAL OUTPUT STRUCTURE
==================================================

Return the result in exactly this order:

# FEATURE UNDER TEST
# STORYBOARD JOURNEY MAP
# SCREEN EVIDENCE SUMMARY
# KEY RISKS
# EXPLORATORY TEST CHARTERS (Charters 01 through 27)
# CROSS-CUTTING EXPLORATION
# COVERAGE SUMMARY
# PRIORITY SUMMARY
# UNKNOWN / NEEDS EXPLORATION
# TESTER EXECUTION GUIDANCE
`;

/**
 * Builds a structured evidence index from the active storyboard screens.
 */
export function buildStoryboardEvidenceMarkdown(
  flowTitle: string,
  screens: StoryboardScreen[],
  executiveContext?: StoryboardExecutiveContext
): string {
  let output = `\n==================================================\n`;
  output += `STORYBOARD EVIDENCE & RECONSTRUCTED CONTEXT PACK\n`;
  output += `==================================================\n\n`;

  output += `FEATURE NAME: ${flowTitle || 'User Flow'}\n`;
  output += `TOTAL SCREENS: ${screens.length}\n\n`;

  if (executiveContext) {
    output += `### EXECUTIVE PLAN SPECIFICATIONS & BLUEPRINT PILLARS:\n`;
    if (executiveContext.featuresAndServices) {
      output += `- 1. Features & Services: ${executiveContext.featuresAndServices}\n`;
    }
    if (executiveContext.userTypes) {
      output += `- 2. User Types / Personas: ${executiveContext.userTypes}\n`;
    }
    if (executiveContext.journeysAndNavigation) {
      output += `- 3. Journeys & Navigation: ${executiveContext.journeysAndNavigation}\n`;
    }
    if (executiveContext.interactionReference) {
      output += `- 4. Interaction Reference: ${executiveContext.interactionReference}\n`;
    }
    if (executiveContext.businessRules) {
      output += `- 5. Business Rules & Constraints: ${executiveContext.businessRules}\n`;
    }
    if (executiveContext.systemFailureStates) {
      output += `- 6. System & Failure States: ${executiveContext.systemFailureStates}\n`;
    }
    if (executiveContext.communicationsDependencies) {
      output += `- 7. Communications & Dependencies: ${executiveContext.communicationsDependencies}\n`;
    }
    if (executiveContext.historicalKnowledgeRisk || (executiveContext.liveDefects && executiveContext.liveDefects.length > 0)) {
      output += `- 8. Historical Knowledge & Risks: ${executiveContext.historicalKnowledgeRisk || 'Observed runtime risks and empirical defect history'}\n`;
    }
    if (executiveContext.liveDefects && executiveContext.liveDefects.length > 0) {
      output += `\n  [LIVE DEFECT EVIDENCE & ACTIVE STUDIO FAILURES (DEFECT BRIDGE)]:\n`;
      output += `  (The following failure observations and screenshot evidence were actively logged during test runs in QA Studio. You MUST dedicate specific exploratory charters and scenarios to reproduce, isolate, and verify regression resistance around these exact bugs.)\n\n`;
      executiveContext.liveDefects.forEach((defect, dIdx) => {
        const promptLabel = defect.promptId ? ` (Prompt ${defect.promptId})` : '';
        const screenLabel = defect.screenReference ? ` on [${defect.screenReference}]` : '';
        output += `  • Defect #${dIdx + 1} [${defect.status.toUpperCase()}]${promptLabel}${screenLabel}:\n`;
        output += `    - Observation: "${defect.observations}"\n`;
        if (defect.mediaUrl) {
          output += `    - Screenshot Proof: ${defect.mediaUrl}\n`;
        }
        if (defect.runName) {
          const runDate = defect.executedAt ? ` on ${new Date(defect.executedAt).toLocaleDateString()}` : '';
          output += `    - Test Session: "${defect.runName}"${runDate}\n`;
        }
      });
    }
    output += `\n`;
  }

  output += `### NUMBERED SCREEN EVIDENCE INDEX:\n\n`;

  screens.forEach((screen, index) => {
    const badge = screen.stepBadge || `#${index + 1}`;
    output += `---
SCREEN ${badge}: "${screen.name || `Screen ${index + 1}`}"
Position: Step ${index + 1} of ${screens.length}${screen.isSubScreen ? ' (Sub-screen/Modal branch)' : ''}
`;

    if (screen.actions && screen.actions.length > 0) {
      output += `Recorded User Actions:\n`;
      screen.actions.forEach((act, aIdx) => {
        const actionNum = `${badge.replace('#', '')}.${aIdx + 1}`;
        output += `  [${actionNum}] ${act.description}${act.type ? ` (${act.type})` : ''}\n`;
      });
    } else {
      output += `Recorded User Actions: Default screen inspection / interaction.\n`;
    }

    if (screen.expectedResult) {
      output += `Expected System Response / Evidence Note: ${screen.expectedResult}\n`;
    }
    output += `\n`;
  });

  return output;
}

/**
 * Builds the complete unified prompt pack for ChatGPT.
 */
export function buildCompleteChatGptPromptPack(
  flowTitle: string,
  screens: StoryboardScreen[],
  executiveContext?: StoryboardExecutiveContext
): string {
  const evidence = buildStoryboardEvidenceMarkdown(flowTitle, screens, executiveContext);
  return `${SENIOR_QA_SYSTEM_PROMPT_TEMPLATE}\n${evidence}\n\n==================================================\nEXECUTION INSTRUCTION FOR CHATGPT\n==================================================\nPlease analyze the above storyboard evidence and generate the complete 27-charter suite with at least 6 exploration prompts per table, following the exact 16-section structure specified above.`;
}

/**
 * Splits the execution into two clean halves so ChatGPT Web users can paste Part 1 and Part 2
 * without hitting single-turn completion token limits.
 */
export function buildSplitChatGptPromptPack(
  flowTitle: string,
  screens: StoryboardScreen[],
  executiveContext?: StoryboardExecutiveContext
): { part1: string; part2: string } {
  const evidence = buildStoryboardEvidenceMarkdown(flowTitle, screens, executiveContext);

  const part1 = `${SENIOR_QA_SYSTEM_PROMPT_TEMPLATE}
${evidence}

==================================================
PART 1 EXECUTION INSTRUCTION (CHARTERS 01 TO 14)
==================================================
Please generate:
1. # FEATURE UNDER TEST
2. # STORYBOARD JOURNEY MAP
3. # SCREEN EVIDENCE SUMMARY
4. # KEY RISKS
5. # EXPLORATORY TEST CHARTERS: Output Charters 01 through 14 (Screen-by-Screen Deep Exploration for Screens #1 to #14), with at least 6 exploration scenarios per charter table.

Stop after Charter 14 and wait for my instruction to output Part 2 (Charters 15 through 27).
`;

  const part2 = `Now generate Part 2 of the Senior QA Exploratory Test Charter Suite:
1. # EXPLORATORY TEST CHARTERS: Output Charters 15 through 27:
   - Charters 15 to 17 (Screen-by-Screen for Screens #15 to #17)
   - Charters 18 to 22 (Variant & Alternative Path Exploration)
   - Charters 23 to 27 (Deep System Resilience, Financial Arithmetic Ledger & Concurrency)
   With at least 6 exploration scenarios per charter table.
2. # CROSS-CUTTING EXPLORATION
3. # COVERAGE SUMMARY
4. # PRIORITY SUMMARY
5. # UNKNOWN / NEEDS EXPLORATION
6. # TESTER EXECUTION GUIDANCE
`;

  return { part1, part2 };
}
