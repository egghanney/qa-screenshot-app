import { ContextPack, Charter, GenerationMetadataSchema } from '../contracts/schemas';
import { validateCharterSuite } from '../validation/charterQualityGate';
import {
  buildPass1MultimodalOpenAiBlocks,
  buildPass1MultimodalGeminiParts,
  buildPass2AnalyzePrompt,
  buildPass3ChallengePrompt,
  buildPass4GeneratePrompt
} from '../prompts/passes';

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

/**
 * Automated Verification Suite for Multimodal Storyboard Integration
 * Validates the 5 Core Requirements:
 * 1. Default disabled (multimodal_enabled defaults to false).
 * 2. Complete tracking: requested, resolved, unavailable, used.
 * 3. Passes 2-4 maintain primary storyboard context independently.
 * 4. Missing screenshot penalty in Quality Gate Check 4.
 * 5. Provider payload builder correctness (OpenAI blocks & Gemini parts).
 */
export function runMultimodalVerificationSuite(): {
  allPassed: boolean;
  testResults: Array<{ name: string; passed: boolean; details: string }>;
} {
  const testResults: Array<{ name: string; passed: boolean; details: string }> = [];

  // Mock Context Pack with 3 sequenced screens
  const mockPack: ContextPack = {
    feature: {
      id: 'test-feat-01',
      name: 'Mobile Transfer',
      goal: 'Send funds to contact',
      description: 'Peer to peer transfer'
    },
    framework: {
      features_services: ['P2P Transfer'],
      user_types: ['Standard User'],
      journeys_navigation: ['Input -> Confirm -> Success'],
      interactions_configuration: ['Amount input', 'Proceed button'],
      business_rules_constraints: ['Limit GHS 1000'],
      system_failure_states: ['Network Timeout'],
      communications_dependencies: ['SMS API'],
      historical_knowledge_risk: ['Duplicate tap debit']
    },
    screens: [
      {
        screen_id: 'scr-1',
        screen_number: 1,
        screen_name: 'Recipient Screen',
        image_url: 'https://example.com/scr1.png',
        user_actions: [{ sequence: 1, action: 'Enter phone number', purpose: 'Target' }],
        visible_elements: ['Phone Input', 'Next Button'],
        observed_behaviour: ['Validates 10 digits'],
        unknowns: []
      },
      {
        screen_id: 'scr-2',
        screen_number: 2,
        screen_name: 'Review & Confirm',
        image_url: undefined, // Missing image!
        user_actions: [{ sequence: 1, action: 'Tap Confirm', purpose: 'Authorize' }],
        visible_elements: ['Summary Card', 'Confirm Button'],
        observed_behaviour: ['Shows total debit'],
        unknowns: []
      },
      {
        screen_id: 'scr-3',
        screen_number: 3,
        screen_name: 'Receipt Screen',
        image_url: 'https://example.com/scr3.png',
        user_actions: [{ sequence: 1, action: 'Tap Done', purpose: 'Dismiss' }],
        visible_elements: ['Transaction ID', 'Done Button'],
        observed_behaviour: ['Displays Reference ID'],
        unknowns: []
      }
    ],
    user_actions: [],
    known_unknowns: ['Unknown daily count limit'],
    previous_findings: [],
    evidence_index: {
      confirmed: [{ id: 'c1', fact: 'Limit GHS 1000', classification: 'CONFIRMED' }],
      observed: [{ id: 'o1', fact: 'Screen 1 visible', classification: 'OBSERVED' }],
      inferred: [],
      unknown: [],
      needs_exploration: []
    }
  };

  // Mock resolved images (only scr-1 and scr-3 resolved, scr-2 unavailable)
  const resolvedImages = [
    {
      screen_id: 'scr-1',
      screen_number: 1,
      screen_name: 'Recipient Screen',
      image_url: 'https://example.com/scr1.png',
      mimeType: 'image/png',
      base64Data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    },
    {
      screen_id: 'scr-3',
      screen_number: 3,
      screen_name: 'Receipt Screen',
      image_url: 'https://example.com/scr3.png',
      mimeType: 'image/png',
      base64Data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    }
  ];

  // Test 1: OpenAI Multimodal Payload Builder
  const openAiBlocks = buildPass1MultimodalOpenAiBlocks(mockPack, resolvedImages);
  const imageBlocks = openAiBlocks.filter(b => b.type === 'image_url');
  const unavailableTextBlocks = openAiBlocks.filter(b => b.type === 'text' && b.text.includes('[IMAGE UNAVAILABLE: Screen #2'));
  const hasScreen1Action = openAiBlocks.some(b => b.type === 'text' && b.text.includes('Enter phone number'));
  const test1Passed = imageBlocks.length === 2 && unavailableTextBlocks.length === 1 && hasScreen1Action;
  testResults.push({
    name: '1. OpenAI Multimodal Payload Structure',
    passed: test1Passed,
    details: `Generated ${openAiBlocks.length} blocks (${imageBlocks.length} image_url blocks, ${unavailableTextBlocks.length} unavailable notice, action text preserved: ${hasScreen1Action})`
  });

  // Test 2: Gemini Multimodal Parts Builder
  const geminiParts = buildPass1MultimodalGeminiParts(mockPack, resolvedImages);
  const inlineDataParts = geminiParts.filter(p => 'inlineData' in p);
  const geminiUnavailParts = geminiParts.filter(p => 'text' in p && p.text.includes('[IMAGE UNAVAILABLE: Screen #2'));
  const test2Passed = inlineDataParts.length === 2 && geminiUnavailParts.length === 1;
  testResults.push({
    name: '2. Gemini Multimodal Parts Structure',
    passed: test2Passed,
    details: `Generated ${geminiParts.length} parts (${inlineDataParts.length} inlineData parts, ${geminiUnavailParts.length} unavailable fallback)`
  });

  // Test 3: Passes 2-4 Storyboard Independence
  const p2 = buildPass2AnalyzePrompt(mockPack, { intent: 'Test' });
  const p3 = buildPass3ChallengePrompt({ risks: [] }, mockPack);
  const p4 = buildPass4GeneratePrompt(mockPack, { risks: [] }, 3);

  const p2HasStoryboard = p2.includes('Screen #1 "Recipient Screen"') && p2.includes('Enter phone number');
  const p3HasGroundTruth = p3.includes('PRIMARY STORYBOARD GROUND-TRUTH') && p3.includes('Recipient Screen');
  const p4HasFlow = p4.includes('Storyboard Flow: #1 "Recipient Screen"') && p4.includes('Enter phone number');
  const test3Passed = p2HasStoryboard && p3HasGroundTruth && p4HasFlow;
  testResults.push({
    name: '3. Passes 2-4 Storyboard Independence',
    passed: test3Passed,
    details: `Pass 2 has storyboard: ${p2HasStoryboard}, Pass 3 has ground truth: ${p3HasGroundTruth}, Pass 4 has flow & actions: ${p4HasFlow}`
  });

  // Test 4: Quality Gate Missing Image Penalty
  const mockCharters: Charter[] = [
    {
      id: 'ch-1',
      feature_id: mockPack.feature.id,
      title: 'Transfer Integrity',
      mission: 'Verify transaction integrity across recipient, confirm, and receipt screens.',
      user_persona: 'Verified User',
      starting_condition: 'User on Screen 1',
      expected_outcome: 'Transaction completes',
      risk_level: 'High',
      exploration_prompts: [
        {
          id: 'PRM-01',
          prompt: 'Execute transfer from Recipient Screen to Receipt Screen with nominal value.',
          category: 'Golden Path',
          status: 'Untested',
          observations: '',
          evidence: [],
          derived_from: {
            features: ['Mobile Transfer'],
            journeys: ['Input -> Confirm -> Success'],
            interactions: ['Enter phone number'],
            business_rules: ['Limit GHS 1000'],
            failure_states: [],
            risks: ['Duplicate tap debit'],
            screens: ['Recipient Screen', 'Review & Confirm', 'Receipt Screen'],
            user_actions: ['Enter phone number', 'Tap Confirm'],
            historical_risks: []
          }
        }
      ],
      coverage: { blueprint_areas: ['features_services'], exploration_dimensions: ['Navigation Paths'] },
      traceability: {},
      generation_metadata: {
        generation_id: 'gen-test-1',
        context_version: '2026.1',
        blueprint_version: '2026.1',
        screen_version: '2026.1',
        schema_version: '2026-07-28',
        prompt_version: '1.0.0',
        analysis_version: '1.0.0',
        validator_version: '9-check-v1',
        provider: 'openai-gpt-4o',
        model: 'gpt-4o',
        multimodal_enabled: true,
        screenshots_requested: ['Screen #1 "Recipient Screen"', 'Screen #2 "Review & Confirm"', 'Screen #3 "Receipt Screen"'],
        screenshots_resolved: ['Screen #1 "Recipient Screen"', 'Screen #3 "Receipt Screen"'],
        screenshots_unavailable: ['Screen #2 "Review & Confirm": Missing image URL'],
        screenshots_used: ['Screen #1 "Recipient Screen"', 'Screen #3 "Receipt Screen"'],
        generated_at: new Date().toISOString()
      },
      quality_score: 90
    }
  ];

  // Test 4: Quality Gate Missing Image Penalty & Rating Ceiling
  const gateReport1 = validateCharterSuite(mockCharters, mockPack, mockCharters[0].generation_metadata);
  const evidenceScore1 = gateReport1.checks.evidence_grounded_claims.score;
  const hasDegradedIssue1 = gateReport1.issues.some(i => i.includes('Visual evidence coverage degraded'));
  const hasCeilingNote1 = gateReport1.issues.some(i => i.includes('Quality Rating capped at "Review"'));
  const ceiling1Passed = gateReport1.rating === 'Review' && gateReport1.quality_score <= 74;

  // Critical visual degradation: 2 missing interactive screens -> Capped at Regenerate and invalid
  const criticalMeta = {
    ...mockCharters[0].generation_metadata,
    screenshots_unavailable: [
      'Screen #1 "Recipient Screen": Missing image URL',
      'Screen #2 "Review & Confirm": Missing image URL'
    ]
  };
  const gateReport2 = validateCharterSuite(mockCharters, mockPack, criticalMeta);
  const ceiling2Passed = gateReport2.rating === 'Regenerate' && !gateReport2.valid && gateReport2.quality_score <= 55;

  const test4Passed = evidenceScore1 < 100 && hasDegradedIssue1 && hasCeilingNote1 && ceiling1Passed && ceiling2Passed;
  testResults.push({
    name: '4. Quality Gate Missing Screenshot Penalty & Rating Ceiling',
    passed: test4Passed,
    details: `1 missing screen -> Capped at "${gateReport1.rating}" (score: ${gateReport1.quality_score}); 2 missing screens -> Capped at "${gateReport2.rating}" (valid: ${gateReport2.valid}, score: ${gateReport2.quality_score})`
  });

  // Test 5: Metadata Defaults & Schema Integrity
  const defaultCheck = GenerationMetadataSchema.parse({
    generation_id: 'gen-001',
    context_version: '2026.1',
    blueprint_version: '2026.1',
    screen_version: '2026.1',
    schema_version: '2026-07-28',
    prompt_version: '1.0.0',
    analysis_version: '1.0.0',
    validator_version: '9-check-v1',
    provider: 'engine',
    model: 'model',
    generated_at: new Date().toISOString()
  });
  const test5Passed = defaultCheck.multimodal_enabled === false &&
    Array.isArray(defaultCheck.screenshots_requested) && defaultCheck.screenshots_requested.length === 0 &&
    Array.isArray(defaultCheck.screenshots_resolved) && defaultCheck.screenshots_resolved.length === 0 &&
    Array.isArray(defaultCheck.screenshots_unavailable) && defaultCheck.screenshots_unavailable.length === 0 &&
    Array.isArray(defaultCheck.screenshots_used) && defaultCheck.screenshots_used.length === 0;

  testResults.push({
    name: '5. Metadata Default Integrity (multimodal_enabled: false)',
    passed: test5Passed,
    details: `multimodal_enabled defaulted to ${defaultCheck.multimodal_enabled}, all 4 screenshot tracking arrays initialized to empty`
  });

  const allPassed = testResults.every(r => r.passed);
  return { allPassed, testResults };
}
