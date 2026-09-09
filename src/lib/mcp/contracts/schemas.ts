import { z } from 'zod';

// ==========================================
// 1. Evidence Classification & Normalized Index
// ==========================================

export const EvidenceClassificationSchema = z.enum([
  'CONFIRMED',
  'OBSERVED',
  'INFERRED',
  'UNKNOWN',
  'NEEDS_EXPLORATION'
]);
export type EvidenceClassification = z.infer<typeof EvidenceClassificationSchema>;

export const EvidenceItemSchema = z.object({
  id: z.string(),
  fact: z.string(),
  source: z.string().optional(),
  dimension: z.string().optional(),
  screen_id: z.string().optional(),
  classification: EvidenceClassificationSchema
});
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;

export const EvidenceIndexSchema = z.object({
  confirmed: z.array(EvidenceItemSchema),
  observed: z.array(EvidenceItemSchema),
  inferred: z.array(EvidenceItemSchema),
  unknown: z.array(EvidenceItemSchema),
  needs_exploration: z.array(EvidenceItemSchema)
});
export type EvidenceIndex = z.infer<typeof EvidenceIndexSchema>;

// ==========================================
// 2. Feature Context & 8 Blueprint Pillars
// ==========================================

export const UserActionSchema = z.object({
  sequence: z.number(),
  action: z.string(),
  purpose: z.string()
});
export type UserAction = z.infer<typeof UserActionSchema>;

export const ScreenEvidenceSchema = z.object({
  screen_id: z.string(),
  screen_number: z.number(),
  screen_name: z.string(),
  image_url: z.string().optional(),
  user_actions: z.array(UserActionSchema).default([]),
  visible_elements: z.array(z.string()).default([]),
  observed_behaviour: z.array(z.string()).default([]),
  unknowns: z.array(z.string()).default([])
});
export type ScreenEvidence = z.infer<typeof ScreenEvidenceSchema>;

export const BlueprintPillarsSchema = z.object({
  features_services: z.array(z.string()).default([]),
  user_types: z.array(z.string()).default([]),
  journeys_navigation: z.array(z.string()).default([]),
  interactions_configuration: z.array(z.string()).default([]),
  business_rules_constraints: z.array(z.string()).default([]),
  system_failure_states: z.array(z.string()).default([]),
  communications_dependencies: z.array(z.string()).default([]),
  historical_knowledge_risk: z.array(z.string()).default([])
});
export type BlueprintPillars = z.infer<typeof BlueprintPillarsSchema>;

export const FeatureContextSchema = z.object({
  feature_id: z.string(),
  feature_name: z.string(),
  feature_goal: z.string().optional(),
  description: z.string().optional(),
  blueprint: BlueprintPillarsSchema,
  screens: z.array(ScreenEvidenceSchema).default([]),
  known_unknowns: z.array(z.string()).default([]),
  previous_findings: z.array(z.string()).default([])
});
export type FeatureContext = z.infer<typeof FeatureContextSchema>;

// Context Pack returned by get_context_pack()
export const ContextPackSchema = z.object({
  feature: z.object({
    id: z.string(),
    name: z.string(),
    goal: z.string(),
    description: z.string().optional()
  }),
  framework: BlueprintPillarsSchema,
  screens: z.array(ScreenEvidenceSchema),
  user_actions: z.array(z.object({
    screen_id: z.string(),
    screen_name: z.string(),
    actions: z.array(UserActionSchema)
  })),
  known_unknowns: z.array(z.string()),
  previous_findings: z.array(z.string()),
  evidence_index: EvidenceIndexSchema
});
export type ContextPack = z.infer<typeof ContextPackSchema>;

// ==========================================
// 3. Derived Analysis Models
// ==========================================

// Topological Journey
export const JourneyTransitionSchema = z.object({
  from: z.string(),
  to: z.string(),
  trigger: z.string(),
  is_failure: z.boolean().default(false),
  is_recovery: z.boolean().default(false)
});
export type JourneyTransition = z.infer<typeof JourneyTransitionSchema>;

export const JourneyAnalysisSchema = z.object({
  start: z.string(),
  goal: z.string(),
  states: z.array(z.string()),
  transitions: z.array(JourneyTransitionSchema),
  decision_points: z.array(z.string()),
  terminal_states: z.array(z.string()),
  failure_paths: z.array(z.string()),
  recovery_paths: z.array(z.string())
});
export type JourneyAnalysis = z.infer<typeof JourneyAnalysisSchema>;

// State Analysis
export const StateAnalysisSchema = z.object({
  states: z.array(z.string()),
  boundaries: z.array(z.string()),
  irreversible_actions: z.array(z.string()),
  transition_triggers: z.array(z.string())
});
export type StateAnalysis = z.infer<typeof StateAnalysisSchema>;

// Data Consistency Analysis
export const DataFieldStageSchema = z.object({
  field: z.string(),
  stage: z.enum([
    'input',
    'confirmation',
    'processing',
    'success',
    'failure',
    'receipt',
    'history',
    'notification'
  ]),
  screen_id: z.string().optional(),
  description: z.string().optional()
});
export type DataFieldStage = z.infer<typeof DataFieldStageSchema>;

export const DataEntitySchema = z.object({
  name: z.string(),
  fields: z.array(z.string()),
  lifecycle_stages: z.array(DataFieldStageSchema)
});
export type DataEntity = z.infer<typeof DataEntitySchema>;

export const DataConsistencyAnalysisSchema = z.object({
  entities: z.array(DataEntitySchema),
  potential_inconsistencies: z.array(z.string())
});
export type DataConsistencyAnalysis = z.infer<typeof DataConsistencyAnalysisSchema>;

// Risk Analysis
export const SourcedRiskSchema = z.object({
  risk_id: z.string(),
  title: z.string(),
  severity: z.enum(['Low', 'Medium', 'High', 'Critical']),
  reason: z.string(),
  source: z.string(),
  derived_from: z.array(z.string())
});
export type SourcedRisk = z.infer<typeof SourcedRiskSchema>;

export const RiskAnalysisSchema = z.object({
  risks: z.array(SourcedRiskSchema)
});
export type RiskAnalysis = z.infer<typeof RiskAnalysisSchema>;

// Separated Coverage Models
export const PillarCoverageDetailSchema = z.object({
  covered: z.number(),
  total_known: z.number(),
  gaps: z.array(z.string())
});

export const BlueprintCoverageSchema = z.object({
  features_services: PillarCoverageDetailSchema,
  user_types: PillarCoverageDetailSchema,
  journeys_navigation: PillarCoverageDetailSchema,
  interactions_configuration: PillarCoverageDetailSchema,
  business_rules_constraints: PillarCoverageDetailSchema,
  system_failure_states: PillarCoverageDetailSchema,
  communications_dependencies: PillarCoverageDetailSchema,
  historical_knowledge_risk: PillarCoverageDetailSchema
});
export type BlueprintCoverage = z.infer<typeof BlueprintCoverageSchema>;

export const ExplorationCoverageSchema = z.object({
  dimensions_tested: z.array(z.string()),
  dimensions_omitted: z.array(z.string()),
  rationale_for_omissions: z.record(z.string())
});
export type ExplorationCoverage = z.infer<typeof ExplorationCoverageSchema>;

export const CoverageAnalysisSchema = z.object({
  blueprint_coverage: BlueprintCoverageSchema,
  exploration_coverage: ExplorationCoverageSchema,
  overall_coverage_pct: z.number()
});
export type CoverageAnalysis = z.infer<typeof CoverageAnalysisSchema>;

// Full Feature Analysis Output
export const FeatureAnalysisSchema = z.object({
  analysis_id: z.string(),
  feature_id: z.string(),
  journey_analysis: JourneyAnalysisSchema,
  state_analysis: StateAnalysisSchema,
  data_analysis: DataConsistencyAnalysisSchema,
  risk_analysis: RiskAnalysisSchema,
  coverage_analysis: CoverageAnalysisSchema,
  unknowns: z.array(z.string()),
  assumptions: z.array(z.string()),
  created_at: z.string()
});
export type FeatureAnalysis = z.infer<typeof FeatureAnalysisSchema>;

// ==========================================
// 4. Charters & Prompts
// ==========================================

export const PromptStatusSchema = z.enum([
  'Untested',
  'Explored',
  'Issue Found',
  'Blocked',
  'Not Applicable',
  'Needs Follow-up'
]);
export type PromptStatus = z.infer<typeof PromptStatusSchema>;

export const PromptTraceabilitySchema = z.object({
  features: z.array(z.string()).default([]),
  journeys: z.array(z.string()).default([]),
  interactions: z.array(z.string()).default([]),
  business_rules: z.array(z.string()).default([]),
  failure_states: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  screens: z.array(z.string()).default([]),
  user_actions: z.array(z.string()).default([]),
  historical_risks: z.array(z.string()).default([])
});
export type PromptTraceability = z.infer<typeof PromptTraceabilitySchema>;

export const CharterPromptSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  category: z.string().optional(),
  status: PromptStatusSchema.default('Untested'),
  observations: z.string().default(''),
  evidence: z.array(z.string()).default([]),
  derived_from: PromptTraceabilitySchema
});
export type CharterPrompt = z.infer<typeof CharterPromptSchema>;

export const GenerationMetadataSchema = z.object({
  generation_id: z.string(),
  request_id: z.string().optional(),
  idempotency_key: z.string().optional(),
  context_version: z.string(),
  blueprint_version: z.string(),
  screen_version: z.string(),
  schema_version: z.string(),
  prompt_version: z.string(),
  analysis_version: z.string(),
  validator_version: z.string(),
  provider: z.string(),
  model: z.string(),
  multimodal_enabled: z.boolean().default(false),
  screenshots_requested: z.array(z.string()).default([]),
  screenshots_resolved: z.array(z.string()).default([]),
  screenshots_unavailable: z.array(z.string()).default([]),
  screenshots_used: z.array(z.string()).default([]),
  generated_at: z.string()
});
export type GenerationMetadata = z.infer<typeof GenerationMetadataSchema>;

export const CharterSchema = z.object({
  id: z.string(),
  feature_id: z.string(),
  title: z.string(),
  mission: z.string(),
  user_persona: z.string(),
  starting_condition: z.string(),
  expected_outcome: z.string(),
  risk_level: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
  exploration_prompts: z.array(CharterPromptSchema),
  coverage: z.object({
    blueprint_areas: z.array(z.string()).default([]),
    exploration_dimensions: z.array(z.string()).default([])
  }),
  traceability: z.record(PromptTraceabilitySchema).default({}),
  generation_metadata: GenerationMetadataSchema,
  quality_score: z.number().min(0).max(100).default(85)
});
export type Charter = z.infer<typeof CharterSchema>;

export const CharterSuiteSchema = z.object({
  feature_id: z.string(),
  analysis_id: z.string(),
  charters: z.array(CharterSchema),
  suite_quality_score: z.number().min(0).max(100),
  generation_metadata: GenerationMetadataSchema
});
export type CharterSuite = z.infer<typeof CharterSuiteSchema>;

// ==========================================
// 5. Validation Quality Gate Report
// ==========================================

export const QualityGateCheckSchema = z.object({
  name: z.string(),
  passed: z.boolean(),
  score: z.number(), // 0 - 100
  details: z.string()
});
export type QualityGateCheck = z.infer<typeof QualityGateCheckSchema>;

export const QualityGateReportSchema = z.object({
  valid: z.boolean(),
  quality_score: z.number().min(0).max(100),
  rating: z.enum(['Strong', 'Good', 'Review', 'Regenerate']),
  checks: z.object({
    schema_integrity: QualityGateCheckSchema,
    required_fields: QualityGateCheckSchema,
    traceability_sourcing: QualityGateCheckSchema,
    evidence_grounded_claims: QualityGateCheckSchema,
    duplicate_detection: QualityGateCheckSchema,
    feature_relevance: QualityGateCheckSchema,
    risk_coverage: QualityGateCheckSchema,
    unknown_integrity: QualityGateCheckSchema,
    exploration_quality: QualityGateCheckSchema
  }),
  issues: z.array(z.string()),
  unsupported_assumptions: z.array(z.string()),
  duplicate_prompt_ids: z.array(z.string()),
  timestamp: z.string()
});
export type QualityGateReport = z.infer<typeof QualityGateReportSchema>;

// ==========================================
// 6. Tester Findings & Follow-Up Charters
// ==========================================

export const ScenarioObservationSchema = z.object({
  prompt_id: z.string(),
  status: PromptStatusSchema,
  observation: z.string(),
  media_urls: z.array(z.string()).default([]),
  timestamp: z.string()
});
export type ScenarioObservation = z.infer<typeof ScenarioObservationSchema>;

export const ExecutionResultsSchema = z.object({
  charter_id: z.string(),
  feature_id: z.string(),
  prompts: z.array(ScenarioObservationSchema),
  observations: z.array(z.string()).default([]),
  issues: z.array(z.string()).default([]),
  blocked_items: z.array(z.string()).default([]),
  new_unknowns: z.array(z.string()).default([])
});
export type ExecutionResults = z.infer<typeof ExecutionResultsSchema>;

export const FollowUpCharterSchema = z.object({
  id: z.string(),
  feature_id: z.string(),
  trigger_charter_id: z.string(),
  trigger_prompt_id: z.string(),
  trigger_finding: z.string(),
  target_risk: z.string(),
  title: z.string(),
  mission: z.string(),
  exploration_prompts: z.array(CharterPromptSchema),
  traceability: PromptTraceabilitySchema
});
export type FollowUpCharter = z.infer<typeof FollowUpCharterSchema>;

// ==========================================
// 7. Human Feedback Tracking
// ==========================================

export const FeedbackReasonSchema = z.enum([
  'Irrelevant',
  'Duplicate',
  'Too broad',
  'Too scripted',
  'Unsupported assumption',
  'Missing risk',
  'Wrong interpretation',
  'Other'
]);
export type FeedbackReason = z.infer<typeof FeedbackReasonSchema>;

export const HumanCharterReviewSchema = z.object({
  charter_id: z.string(),
  decision: z.enum(['Approved', 'Edited', 'Regenerated', 'Rejected']),
  reason: FeedbackReasonSchema.optional(),
  notes: z.string().optional(),
  reviewed_by: z.string(),
  reviewed_at: z.string()
});
export type HumanCharterReview = z.infer<typeof HumanCharterReviewSchema>;
