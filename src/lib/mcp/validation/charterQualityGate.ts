import { Charter, ContextPack, QualityGateReport, CharterSchema, GenerationMetadata } from '../contracts/schemas';
import { calculateQualityScore } from './qualityScorer';

/**
 * DETERMINISTIC CHARTER QUALITY GATE (9 CHECKS)
 * Runs independently in TypeScript code. Never trusts AI self-validation.
 */
export function validateCharterSuite(
  charters: Charter[],
  contextPack: ContextPack,
  metadata?: GenerationMetadata
): QualityGateReport {
  const issues: string[] = [];
  const unsupportedAssumptions: string[] = [];
  const duplicatePromptIds: string[] = [];

  // Initialize checks
  const checks: QualityGateReport['checks'] = {
    schema_integrity: { name: '1. Schema Integrity', passed: true, score: 100, details: 'All charters conform to Zod schema.' },
    required_fields: { name: '2. Required Fields', passed: true, score: 100, details: 'All missions, personas, and outcomes are well-formed.' },
    traceability_sourcing: { name: '3. Traceability Sourcing', passed: true, score: 100, details: 'Every prompt maps to source context.' },
    evidence_grounded_claims: { name: '4. Evidence-Grounded Claims', passed: true, score: 100, details: 'Claims are backed by confirmed or observed evidence.' },
    duplicate_detection: { name: '5. Duplicate Detection', passed: true, score: 100, details: 'No duplicate or conflicting prompts detected.' },
    feature_relevance: { name: '6. Feature Relevance', passed: true, score: 100, details: 'Prompts directly interrogate the target feature scope.' },
    risk_coverage: { name: '7. Risk Coverage', passed: true, score: 100, details: 'High and critical risk vectors are targeted.' },
    unknown_integrity: { name: '8. Unknown Integrity', passed: true, score: 100, details: 'Unknown facts were not converted into assumed requirements.' },
    exploration_quality: { name: '9. Exploration Quality', passed: true, score: 100, details: 'Prompts guide exploratory missions rather than click-scripts.' }
  };

  if (!charters || charters.length === 0) {
    issues.push('No charters provided for validation.');
    return {
      valid: false,
      quality_score: 0,
      rating: 'Regenerate',
      checks,
      issues,
      unsupported_assumptions: [],
      duplicate_prompt_ids: [],
      timestamp: new Date().toISOString()
    };
  }

  // --- CHECK 1: Schema Integrity ---
  for (let i = 0; i < charters.length; i++) {
    const parseResult = CharterSchema.safeParse(charters[i]);
    if (!parseResult.success) {
      checks.schema_integrity.passed = false;
      checks.schema_integrity.score = Math.max(0, checks.schema_integrity.score - 25);
      const errors = parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      issues.push(`Charter #${i + 1} failed schema validation: ${errors}`);
    }
  }

  // Build searchable evidence corpus
  const confirmedFacts = contextPack.evidence_index.confirmed.map(e => e.fact.toLowerCase());
  const observedFacts = contextPack.evidence_index.observed.map(e => e.fact.toLowerCase());
  const screenNames = contextPack.screens.map(s => s.screen_name.toLowerCase());
  const actionNames = contextPack.screens.flatMap(s => s.user_actions.map(a => a.action.toLowerCase()));
  const knownUnknowns = contextPack.known_unknowns.map(u => u.toLowerCase());
  const featureName = contextPack.feature.name.toLowerCase();

  const allPrompts = charters.flatMap(c => c.exploration_prompts);
  let untracedPromptsCount = 0;
  let scriptedPromptsCount = 0;

  // Track semantic tokens for duplicate detection
  const promptTokensList: { id: string; text: string; tokens: Set<string> }[] = [];

  for (const charter of charters) {
    // --- CHECK 2: Required Fields ---
    if (!charter.mission || charter.mission.length < 15) {
      checks.required_fields.passed = false;
      checks.required_fields.score = Math.max(0, checks.required_fields.score - 20);
      issues.push(`Charter "${charter.title}" has an insufficient or missing mission statement.`);
    }
    if (!charter.user_persona || charter.user_persona.length < 5) {
      checks.required_fields.passed = false;
      checks.required_fields.score = Math.max(0, checks.required_fields.score - 10);
      issues.push(`Charter "${charter.title}" lacks a concrete user persona.`);
    }
    if (!charter.expected_outcome || charter.expected_outcome.length < 5) {
      checks.required_fields.passed = false;
      checks.required_fields.score = Math.max(0, checks.required_fields.score - 10);
      issues.push(`Charter "${charter.title}" lacks expected outcome.`);
    }
    if (!charter.exploration_prompts || charter.exploration_prompts.length === 0) {
      checks.required_fields.passed = false;
      checks.required_fields.score = 0;
      issues.push(`Charter "${charter.title}" has no exploration prompts.`);
    }

    for (const p of charter.exploration_prompts) {
      const pText = p.prompt.trim();
      const pLower = pText.toLowerCase();

      // --- CHECK 3: Traceability Sourcing ---
      const hasTrace = p.derived_from && (
        (p.derived_from.features && p.derived_from.features.length > 0) ||
        (p.derived_from.journeys && p.derived_from.journeys.length > 0) ||
        (p.derived_from.interactions && p.derived_from.interactions.length > 0) ||
        (p.derived_from.business_rules && p.derived_from.business_rules.length > 0) ||
        (p.derived_from.failure_states && p.derived_from.failure_states.length > 0) ||
        (p.derived_from.risks && p.derived_from.risks.length > 0) ||
        (p.derived_from.screens && p.derived_from.screens.length > 0) ||
        (p.derived_from.user_actions && p.derived_from.user_actions.length > 0) ||
        (p.derived_from.historical_risks && p.derived_from.historical_risks.length > 0)
      );

      if (!hasTrace) {
        untracedPromptsCount++;
        issues.push(`Prompt [${p.id}] lacks source traceability.`);
      }

      // --- CHECK 4: Evidence-Grounded Claims ---
      // Check for hallucinated jargon or unverified security claims
      if (/quantum encryption|blockchain verification|military grade|biometric iris pass/i.test(pLower)) {
        if (!confirmedFacts.some(f => f.includes('blockchain') || f.includes('biometric'))) {
          unsupportedAssumptions.push(`Prompt [${p.id}] contains unverified technical claim.`);
          checks.evidence_grounded_claims.passed = false;
          checks.evidence_grounded_claims.score = Math.max(0, checks.evidence_grounded_claims.score - 15);
        }
      }

      // --- CHECK 8: Unknown Integrity ---
      for (const unk of knownUnknowns) {
        if (unk.length > 10) {
          const words = unk.split(' ').filter(w => w.length > 4);
          const matchedWords = words.filter(w => pLower.includes(w));
          if (matchedWords.length >= 3 && /must|always|shall|requires that/i.test(pLower)) {
            // Asserted an unknown as a confirmed requirement!
            checks.unknown_integrity.passed = false;
            checks.unknown_integrity.score = Math.max(0, checks.unknown_integrity.score - 20);
            issues.push(`Prompt [${p.id}] appears to assume behavior for known unknown: "${unk.slice(0, 40)}..."`);
          }
        }
      }

      // --- CHECK 9: Exploration Quality (Not Click-Script) ---
      if (/^step\s*1|^click\s+.+\s+then\s+click\s+.+\s+then\s+verify/i.test(pText)) {
        scriptedPromptsCount++;
      }

      // Tokenize for duplicate detection
      const tokens = new Set(
        pLower
          .replace(/[^a-z0-9\s]/g, '')
          .split(/\s+/)
          .filter(t => t.length > 3)
      );
      promptTokensList.push({ id: p.id, text: pText, tokens });
    }
  }

  // --- CHECK 3 Calculation ---
  if (untracedPromptsCount > 0) {
    checks.traceability_sourcing.passed = false;
    const ratio = (allPrompts.length - untracedPromptsCount) / allPrompts.length;
    checks.traceability_sourcing.score = Math.round(ratio * 100);
    checks.traceability_sourcing.details = `${untracedPromptsCount} of ${allPrompts.length} prompts lack derived_from lineage.`;
  }

  // --- CHECK 4 Visual Evidence Integrity Calculation ---
  const effectiveMeta = metadata || charters[0]?.generation_metadata;
  if (effectiveMeta && effectiveMeta.screenshots_unavailable && effectiveMeta.screenshots_unavailable.length > 0) {
    const unavail = effectiveMeta.screenshots_unavailable;
    const interactiveUnavailable = contextPack.screens.filter(s => {
      const isUnavail = unavail.some(u =>
        u.includes(s.screen_name) ||
        u.includes(s.screen_id) ||
        u.includes(`Screen #${s.screen_number}`)
      );
      return isUnavail && (s.user_actions.length > 0 || s.observed_behaviour.length > 0);
    });

    if (interactiveUnavailable.length > 0) {
      const penalty = Math.min(30, interactiveUnavailable.length * 10);
      checks.evidence_grounded_claims.score = Math.max(0, checks.evidence_grounded_claims.score - penalty);
      if (checks.evidence_grounded_claims.score < 80) {
        checks.evidence_grounded_claims.passed = false;
      }
      checks.evidence_grounded_claims.details = `Visual evidence coverage degraded: ${interactiveUnavailable.length} interactive screen(s) lacked available screenshot images (${interactiveUnavailable.map(s => `Screen #${s.screen_number} "${s.screen_name}"`).join(', ')}).`;
      issues.push(`Visual evidence coverage degraded: ${interactiveUnavailable.length} interactive screen(s) unavailable for primary vision inspection.`);
    }
  }

  // --- CHECK 5: Duplicate Detection (Jaccard Similarity) ---
  for (let i = 0; i < promptTokensList.length; i++) {
    for (let j = i + 1; j < promptTokensList.length; j++) {
      const a = promptTokensList[i];
      const b = promptTokensList[j];
      const intersection = [...a.tokens].filter(x => b.tokens.has(x)).length;
      const union = new Set([...a.tokens, ...b.tokens]).size;
      const similarity = union > 0 ? intersection / union : 0;

      if (similarity > 0.8) {
        checks.duplicate_detection.passed = false;
        checks.duplicate_detection.score = Math.max(0, checks.duplicate_detection.score - 20);
        duplicatePromptIds.push(b.id);
        issues.push(`High semantic duplication (${Math.round(similarity * 100)}%) between [${a.id}] and [${b.id}].`);
      }
    }
  }

  // --- CHECK 6: Feature Relevance ---
  const allPromptsText = allPrompts.map(p => p.prompt).join(' ').toLowerCase();
  const mentionsFeature = allPromptsText.includes(featureName) ||
    screenNames.some(sn => allPromptsText.includes(sn)) ||
    actionNames.some(an => allPromptsText.includes(an));

  if (!mentionsFeature && allPrompts.length > 0) {
    checks.feature_relevance.passed = false;
    checks.feature_relevance.score = 50;
    checks.feature_relevance.details = 'Prompts do not explicitly reference feature terms, screens, or actions.';
  }

  // --- CHECK 7: Risk Coverage ---
  const criticalRisks = [
    ...contextPack.framework.system_failure_states,
    ...contextPack.framework.historical_knowledge_risk
  ].map(r => r.toLowerCase());

  let coveredRiskCount = 0;
  for (const risk of criticalRisks) {
    const keyTerms = risk.split(' ').filter(w => w.length > 4);
    if (keyTerms.some(t => allPromptsText.includes(t))) {
      coveredRiskCount++;
    }
  }

  if (criticalRisks.length > 0) {
    const coverageRatio = coveredRiskCount / criticalRisks.length;
    checks.risk_coverage.score = Math.round(coverageRatio * 100);
    if (coverageRatio < 0.4) {
      checks.risk_coverage.passed = false;
      checks.risk_coverage.details = `Only ${coveredRiskCount} of ${criticalRisks.length} critical failure/risk areas addressed.`;
      issues.push('Suite lacks sufficient coverage of critical failure states.');
    }
  }

  // --- CHECK 9 Calculation ---
  if (allPrompts.length > 0 && (scriptedPromptsCount / allPrompts.length) > 0.25) {
    checks.exploration_quality.passed = false;
    checks.exploration_quality.score = Math.max(0, 100 - (scriptedPromptsCount * 25));
    checks.exploration_quality.details = `${scriptedPromptsCount} scenarios are rigidly scripted rather than exploratory missions.`;
    issues.push('Charters contain too many rigid click-by-click scripts.');
  }

  // Compute final quality score and rating
  const { score, rating } = calculateQualityScore(charters, checks);

  const isValid = checks.schema_integrity.passed &&
    checks.required_fields.passed &&
    checks.traceability_sourcing.score >= 80 &&
    score >= 60;

  return {
    valid: isValid,
    quality_score: score,
    rating,
    checks,
    issues,
    unsupported_assumptions: unsupportedAssumptions,
    duplicate_prompt_ids: duplicatePromptIds,
    timestamp: new Date().toISOString()
  };
}
