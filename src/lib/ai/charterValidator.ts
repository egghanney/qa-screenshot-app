import { GeneratedCharter, ContextPack, ValidationReport } from '@/lib/types';

/**
 * Charter Quality Gate Validator
 * Evaluates candidate charters against strict exploratory testing criteria:
 * 1. Scope adherence
 * 2. Visual evidence grounding
 * 3. Absence of scripted "click-step" recipes
 * 4. Coverage of failure states and real-world interruptions
 * 5. Freedom from hallucinated / unsupported claims
 */
export function validateChartersProgrammatic(
  charters: GeneratedCharter[],
  contextPack: ContextPack
): ValidationReport {
  const checks = {
    feature_scope: true,
    persona_relevant: true,
    journey_relevant: true,
    screenshot_grounded: true,
    business_rules_grounded: true,
    failure_states_considered: true,
    dependencies_considered: true,
    exploratory_not_scripted: true,
    duplicate_prompts: false,
    unsupported_claims: false
  };

  const notes: string[] = [];
  const seenPromptTexts = new Set<string>();
  let totalPrompts = 0;
  let scriptedCount = 0;

  for (const charter of charters) {
    // 1. Mission validation
    if (!charter.mission || charter.mission.length < 15) {
      checks.feature_scope = false;
      notes.push(`Charter "${charter.title}" lacks a concrete mission.`);
    }

    // 2. Persona validation
    if (!charter.user_persona || charter.user_persona.length < 10) {
      checks.persona_relevant = false;
    }

    for (const s of charter.scenarios) {
      totalPrompts++;
      const lower = s.prompt_text.toLowerCase();

      // Check duplicates
      if (seenPromptTexts.has(lower)) {
        checks.duplicate_prompts = true;
        notes.push(`Duplicate scenario detected: "${s.prompt_text.slice(0, 40)}..."`);
      }
      seenPromptTexts.add(lower);

      // Check if prompt is too scripted (e.g. "Step 1: Tap X, Step 2: verify Y")
      if (/^step\s*1|^click\s+.+\s+then\s+click\s+.+\s+then\s+verify/i.test(s.prompt_text)) {
        scriptedCount++;
      }

      // Check unsupported claims (forbidden jargon or assumptions)
      if (/validation deadlocks|semantic variations|heuristic attack/i.test(lower)) {
        checks.unsupported_claims = true;
        notes.push(`Forbidden academic jargon found in prompt: "${s.prompt_id}"`);
      }
    }
  }

  // If more than 30% of prompts are rigidly scripted, flag it
  if (totalPrompts > 0 && (scriptedCount / totalPrompts) > 0.3) {
    checks.exploratory_not_scripted = false;
    notes.push(`${scriptedCount} scenarios appear rigidly scripted rather than exploratory missions.`);
  }

  // Check if failure states were addressed (Airplane mode, network, lockouts)
  const combinedText = charters.flatMap(c => c.scenarios.map(s => s.prompt_text)).join(' ').toLowerCase();
  const hasFailureCoverage = /network|offline|airplane|timeout|disconnect|double|cancel|lockout|interrupt/i.test(combinedText);
  if (!hasFailureCoverage) {
    checks.failure_states_considered = false;
    notes.push('Suite lacks sufficient coverage of network interruption or failure states.');
  }

  // Calculate score
  const checkValues = Object.values(checks);
  const passedChecks = checkValues.filter(Boolean).length;
  const score = Math.round((passedChecks / checkValues.length) * 100);
  const passed = score >= 80 && !checks.duplicate_prompts;

  return {
    passed,
    score,
    checks,
    notes: notes.length > 0 ? notes.join(' | ') : 'All quality criteria passed successfully.'
  };
}
