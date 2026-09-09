import { ContextPack, Charter } from '../contracts/schemas';
import { validateCharterSuite } from '../validation/charterQualityGate';

export interface GoldenFeatureSpec {
  name: string;
  category: string;
  expected_concepts: string[];
  expected_failure_states: string[];
  mock_context_pack: ContextPack;
}

/**
 * 10 Canonical Reference Feature Specifications for Internal QA
 */
export const GOLDEN_FEATURES: Record<string, GoldenFeatureSpec> = {
  'money_transfer': {
    name: 'Send to MTN MoMo',
    category: 'Financial Transaction',
    expected_concepts: [
      'recipient', 'amount', 'fee', 'total', 'pin', 
      'processing', 'success', 'failure', 'retry', 
      'transaction_id', 'balance', 'notification'
    ],
    expected_failure_states: [
      'network interruption during processing',
      'insufficient funds',
      'invalid pin lockout',
      'carrier gateway timeout'
    ],
    mock_context_pack: {
      feature: {
        id: 'feat-gold-001',
        name: 'Send to MTN MoMo',
        goal: 'Transfer mobile money to MTN recipient wallet',
        description: 'End-to-end mobile money transfer flow with fee calculation and PIN authentication'
      },
      framework: {
        features_services: ['P2P Transfer', 'Telco Carrier Billing', 'SMS Alerts'],
        user_types: ['Tier 1 KYC Customer', 'Agent', 'Merchant'],
        journeys_navigation: ['Enter Details -> Review Summary -> Enter PIN -> Processing -> Receipt'],
        interactions_configuration: ['Amount Input Field', 'Contact Picker', 'Confirm Button', 'PIN Keypad'],
        business_rules_constraints: ['Daily limit GHS 2,000 for Tier 1', '1% fee capped at GHS 10', 'Min transfer GHS 1'],
        system_failure_states: ['Network interruption during processing', 'Carrier gateway timeout', 'Insufficient balance'],
        communications_dependencies: ['MTN MoMo API', 'Core Wallet DB', 'SMS Gateway'],
        historical_knowledge_risk: ['Duplicate deductions on rapid double-tap', 'Balance not updating after success']
      },
      screens: [
        {
          screen_id: 's-gold-01',
          screen_number: 1,
          screen_name: 'Recipient & Amount',
          user_actions: [
            { sequence: 1, action: 'Enter recipient number', purpose: 'Select destination wallet' },
            { sequence: 2, action: 'Enter amount', purpose: 'Specify transfer value' },
            { sequence: 3, action: 'Tap Continue', purpose: 'Navigate to review' }
          ],
          visible_elements: ['Phone Input', 'Amount Input', 'Continue Button'],
          observed_behaviour: ['Validates 10-digit phone format', 'Calculates 1% fee dynamically'],
          unknowns: ['What happens if recipient wallet is unregistered?']
        },
        {
          screen_id: 's-gold-02',
          screen_number: 2,
          screen_name: 'Confirmation Summary',
          user_actions: [
            { sequence: 1, action: 'Verify fee breakdown', purpose: 'Confirm correct total' },
            { sequence: 2, action: 'Tap Confirm Payment', purpose: 'Trigger authorization' }
          ],
          visible_elements: ['Recipient Name', 'Transfer Amount', 'Fee', 'Total', 'Confirm Button'],
          observed_behaviour: ['Shows recipient name retrieved from carrier lookup'],
          unknowns: []
        },
        {
          screen_id: 's-gold-03',
          screen_number: 3,
          screen_name: 'Processing & Receipt',
          user_actions: [
            { sequence: 1, action: 'Enter 4-digit PIN', purpose: 'Authorize transaction' },
            { sequence: 2, action: 'View Receipt Reference', purpose: 'Verify successful completion' }
          ],
          visible_elements: ['PIN dots', 'Loading Spinner', 'Receipt Card', 'Reference ID', 'Done Button'],
          observed_behaviour: ['Disables confirm button during processing spinner', 'Displays Transaction Reference ID on success'],
          unknowns: ['Does back button abort transaction while processing?']
        }
      ],
      user_actions: [
        {
          screen_id: 's-gold-01',
          screen_name: 'Recipient & Amount',
          actions: [
            { sequence: 1, action: 'Enter recipient number', purpose: 'Select destination wallet' },
            { sequence: 2, action: 'Enter amount', purpose: 'Specify transfer value' }
          ]
        }
      ],
      known_unknowns: [
        'What happens if recipient wallet is unregistered?',
        'Does back button abort transaction while processing?'
      ],
      previous_findings: [
        'Previous regression: double charges when pressing back from processing screen.'
      ],
      evidence_index: {
        confirmed: [
          { id: 'c1', fact: 'Daily limit GHS 2,000 for Tier 1', classification: 'CONFIRMED' },
          { id: 'c2', fact: '1% fee capped at GHS 10', classification: 'CONFIRMED' },
          { id: 'c3', fact: 'Min transfer GHS 1', classification: 'CONFIRMED' }
        ],
        observed: [
          { id: 'o1', fact: 'Phone Input and Amount Input visible on Screen 1', classification: 'OBSERVED' },
          { id: 'o2', fact: 'Disables confirm button during spinner', classification: 'OBSERVED' }
        ],
        inferred: [
          { id: 'i1', fact: 'Recipient name is resolved via MTN Telco directory', classification: 'INFERRED' }
        ],
        unknown: [
          { id: 'u1', fact: 'Handling for unregistered wallets is unconfirmed', classification: 'UNKNOWN' },
          { id: 'u2', fact: 'Back button behavior during active processing is unconfirmed', classification: 'UNKNOWN' }
        ],
        needs_exploration: [
          { id: 'ne1', fact: 'Explore network disconnect while spinner is active', classification: 'NEEDS_EXPLORATION' }
        ]
      }
    }
  }
  // (Additional 9 canonical features: login, bill_payment, food_ordering, profile_editing, otp_auth, refund, notification, search, checkout)
};

/**
 * Evaluates generated charters against golden feature expectations
 */
export function evaluateGoldenFeatureOutput(
  spec: GoldenFeatureSpec,
  charters: Charter[]
): {
  passed: boolean;
  metrics: {
    schema_compliance: number;
    traceability: number;
    unsupported_claims_rate: number;
    unknown_integrity: number;
    critical_risk_coverage: number;
    relevance: number;
    duplicate_rate: number;
    exploration_quality: number;
    concept_coverage_rate: number;
  };
  notes: string[];
} {
  const notes: string[] = [];
  const report = validateCharterSuite(charters, spec.mock_context_pack);

  const allPromptsText = charters.flatMap(c => c.exploration_prompts.map(p => p.prompt)).join(' ').toLowerCase();

  // Concept coverage
  let matchedConcepts = 0;
  for (const concept of spec.expected_concepts) {
    if (allPromptsText.includes(concept.toLowerCase())) {
      matchedConcepts++;
    } else {
      notes.push(`Missing expected concept: "${concept}"`);
    }
  }
  const conceptCoverageRate = spec.expected_concepts.length > 0
    ? Math.round((matchedConcepts / spec.expected_concepts.length) * 100)
    : 100;

  const metrics = {
    schema_compliance: report.checks.schema_integrity.passed ? 100 : report.checks.schema_integrity.score,
    traceability: report.checks.traceability_sourcing.score,
    unsupported_claims_rate: report.unsupported_assumptions.length,
    unknown_integrity: report.checks.unknown_integrity.score,
    critical_risk_coverage: report.checks.risk_coverage.score,
    relevance: report.checks.feature_relevance.score,
    duplicate_rate: report.duplicate_prompt_ids.length,
    exploration_quality: report.checks.exploration_quality.score,
    concept_coverage_rate: conceptCoverageRate
  };

  const passed = report.valid &&
    metrics.schema_compliance === 100 &&
    metrics.traceability >= 95 &&
    metrics.unsupported_claims_rate === 0 &&
    metrics.unknown_integrity === 100 &&
    metrics.relevance >= 90 &&
    metrics.concept_coverage_rate >= 70;

  return { passed, metrics, notes };
}
