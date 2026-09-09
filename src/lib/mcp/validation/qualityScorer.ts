import { Charter, QualityGateReport } from '../contracts/schemas';

/**
 * Heuristic Charter Quality Scorer (0–100)
 * Evaluates candidate charters across 6 weighted dimensions:
 * - Relevance (20)
 * - Risk Alignment (20)
 * - Traceability (20)
 * - Exploratory Quality (15)
 * - Coverage Value (15)
 * - Specificity (10)
 */
export interface QualityScorerOptions {
  missingInteractiveScreensCount?: number;
}

export function calculateQualityScore(
  charters: Charter[],
  qualityGateChecks: QualityGateReport['checks'],
  options?: QualityScorerOptions
): {
  score: number;
  rating: 'Strong' | 'Good' | 'Review' | 'Regenerate';
  ceilingApplied?: 'Review' | 'Regenerate';
} {
  if (!charters || charters.length === 0) {
    return { score: 0, rating: 'Regenerate' };
  }

  let totalScore = 0;

  // 1. Relevance (20 pts)
  if (qualityGateChecks.feature_relevance.passed) {
    totalScore += 20 * (qualityGateChecks.feature_relevance.score / 100);
  }

  // 2. Risk Alignment (20 pts)
  if (qualityGateChecks.risk_coverage.passed) {
    totalScore += 20 * (qualityGateChecks.risk_coverage.score / 100);
  } else {
    totalScore += 10;
  }

  // 3. Traceability (20 pts)
  if (qualityGateChecks.traceability_sourcing.passed) {
    totalScore += 20 * (qualityGateChecks.traceability_sourcing.score / 100);
  }

  // 4. Exploratory Quality (15 pts)
  if (qualityGateChecks.exploration_quality.passed) {
    totalScore += 15 * (qualityGateChecks.exploration_quality.score / 100);
  } else {
    totalScore += 5;
  }

  // 5. Coverage Value (15 pts)
  const allPrompts = charters.flatMap(c => c.exploration_prompts);
  const distinctCategories = new Set(allPrompts.map(p => p.category).filter(Boolean));
  const coverageMultiplier = Math.min(1, distinctCategories.size / 3);
  totalScore += 15 * coverageMultiplier;

  // 6. Specificity & Evidence Grounding (10 pts)
  if (qualityGateChecks.evidence_grounded_claims.passed && qualityGateChecks.unknown_integrity.passed) {
    totalScore += 10;
  } else {
    totalScore += 4;
  }

  let finalScore = Math.round(Math.max(0, Math.min(100, totalScore)));

  let rating: 'Strong' | 'Good' | 'Review' | 'Regenerate';
  if (finalScore >= 90) {
    rating = 'Strong';
  } else if (finalScore >= 75) {
    rating = 'Good';
  } else if (finalScore >= 60) {
    rating = 'Review';
  } else {
    rating = 'Regenerate';
  }

  // ENFORCE VISUAL EVIDENCE RATING CEILING
  // A charter generated without seeing critical storyboard evidence cannot claim "Strong" or "Good"
  let ceilingApplied: 'Review' | 'Regenerate' | undefined;
  const missingScreens = options?.missingInteractiveScreensCount ?? 0;
  if (missingScreens >= 2) {
    rating = 'Regenerate';
    finalScore = Math.min(55, finalScore);
    ceilingApplied = 'Regenerate';
  } else if (missingScreens === 1) {
    if (rating === 'Strong' || rating === 'Good') {
      rating = 'Review';
      finalScore = Math.min(74, finalScore);
      ceilingApplied = 'Review';
    }
  }

  return { score: finalScore, rating, ceilingApplied };
}
