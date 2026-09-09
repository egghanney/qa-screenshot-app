export type PlatformType = 'Android' | 'iOS' | 'Web' | 'Mobile Web' | 'Other';

export type UserRole = 
  | 'Customer' 
  | 'Merchant' 
  | 'Rider' 
  | 'Admin' 
  | 'Staff' 
  | 'Guest' 
  | 'Other';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  platform: PlatformType;
  created_at: string;
  updated_at: string;
}

export interface AdvancedFeatureContext {
  known_business_rules?: string;
  known_limitations?: string;
  known_dependencies?: string;
  known_apis?: string;
  known_notifications?: string;
  known_permissions?: string;
  known_edge_cases?: string;
  historical_behavior?: string;
  existing_requirements?: string;
  additional_notes?: string;
}

export interface Feature {
  id: string;
  project_id: string;
  name: string;
  platform?: PlatformType;
  description: string;
  purpose: string;
  user_types: UserRole[];
  entry_point: string;
  expected_outcome: string;
  context: string | null;
  advanced_context: AdvancedFeatureContext;
  status: 'draft' | 'analyzing' | 'documented' | 'verified';
  version: string;
  created_at: string;
  updated_at: string;
}

export type ScreenStateType = 
  | 'normal' 
  | 'loading' 
  | 'empty' 
  | 'success' 
  | 'error' 
  | 'warning' 
  | 'validation' 
  | 'authentication' 
  | 'permission' 
  | 'confirmation' 
  | 'exceptional';

export interface UIElement {
  id?: string;
  type: 'button' | 'text_field' | 'label' | 'icon' | 'menu' | 'tab' | 'card' | 'list' | 'image' | 'checkbox' | 'toggle' | 'dropdown' | 'navigation';
  label: string;
  value?: string;
  is_interactive: boolean;
  state?: string;
}

export interface AIScreenAnalysis {
  screen_name: string;
  screen_type: string;
  state: ScreenStateType;
  elements: UIElement[];
  visible_text: string[];
  possible_actions: string[];
  suggested_user_action?: string;
  suggested_system_response?: string;
  confidence: 'CONFIRMED' | 'INFERRED' | 'UNKNOWN';
}

export interface ScreenAction {
  id: string;
  order: number;
  type?: 'tap' | 'type' | 'swipe' | 'verify' | 'scroll' | 'wait' | 'other';
  description: string;
}

export interface StoryboardScreen {
  id: string;
  file?: File;
  previewUrl: string;
  name: string;
  isSubScreen: boolean;
  parentScreenId?: string | null;
  stepBadge: string; // e.g. "#1", "#1a", "#2"
  actions: ScreenAction[];
  expectedResult?: string;
  width?: number;
  height?: number;
}

export interface ScreenItem {
  id: string;
  feature_id: string;
  screen_number: number;
  name: string;
  image_url: string;
  storage_path?: string | null;
  description: string | null;
  state: ScreenStateType;
  user_action: string | null;
  expected_behavior: string | null;
  ai_analysis: AIScreenAnalysis | null;
  is_sub_screen?: boolean;
  parent_screen_id?: string | null;
  actions?: ScreenAction[];
  pii_flagged: boolean;
  pii_redactions: Array<{ x: number; y: number; width: number; height: number; type: string }>;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type JourneyNodeType = 'screen' | 'decision' | 'entry' | 'exit' | 'error_state';

export interface JourneyNodeData {
  id: string;
  feature_id: string;
  screen_id?: string | null;
  type: JourneyNodeType;
  label: string;
  position_x: number;
  position_y: number;
  metadata: {
    screen_number?: number;
    image_url?: string;
    state?: ScreenStateType;
    user_action?: string;
    system_response?: string;
    condition?: string;
    notes?: string;
  };
  created_at?: string;
}

export interface JourneyEdgeData {
  id: string;
  feature_id: string;
  source_node_id: string;
  target_node_id: string;
  action: string;
  condition?: string | null;
  system_response?: string | null;
  edge_type: 'default' | 'success' | 'failure' | 'loop' | 'recovery';
  created_at?: string;
}

export type KnowledgeCategory = 
  | 'Features & Services'
  | 'User Types'
  | 'Journeys & Navigation'
  | 'Interaction & Configuration Reference'
  | 'Business Rules & Constraints'
  | 'System & Failure States'
  | 'Communications & Dependencies';

export type ConfidenceLevel = 'CONFIRMED' | 'INFERRED' | 'UNKNOWN';
export type VerificationStatus = 'Verified' | 'Needs Confirmation' | 'Flagged' | 'Rejected';

export interface KnowledgeItem {
  id: string;
  feature_id: string;
  category: KnowledgeCategory;
  title: string;
  content: string;
  source: 'User' | 'Screenshot' | 'AI' | 'Q&A';
  confidence: ConfidenceLevel;
  verification_status: VerificationStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIQuestion {
  id: string;
  feature_id: string;
  question: string;
  answer?: string | null;
  category?: KnowledgeCategory | string;
  status: 'Pending' | 'Answered' | 'Dismissed';
  impact_analysis?: string | null;
  created_at: string;
  updated_at: string;
}

export type CheckpointCategory = 
  | 'Field Validation'
  | 'Navigation'
  | 'Transaction'
  | 'Security & Failure'
  | 'State & Boundary';

export interface QACheckpoint {
  id: string;
  feature_id: string;
  screen_id?: string | null;
  category: CheckpointCategory;
  title: string;
  test_steps: string;
  expected_result: string;
  test_data_notes?: string | null;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Not Run' | 'Passed' | 'Failed' | 'Blocked';
  created_at: string;
}

export type ObservationType = 
  | 'Bug'
  | 'UX Issue'
  | 'Requirement Gap'
  | 'Business Rule Issue'
  | 'Security Concern'
  | 'Data Issue'
  | 'Performance Issue'
  | 'Integration Issue';

export interface QAObservation {
  id: string;
  feature_id: string;
  screen_id?: string | null;
  node_id?: string | null;
  type: ObservationType;
  title: string;
  description: string;
  severity: 'Critical' | 'Major' | 'Minor' | 'Trivial';
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  expected_behavior?: string | null;
  actual_behavior?: string | null;
  evidence_url?: string | null;
  status: 'Open' | 'In Review' | 'Resolved' | "Won't Fix";
  created_at: string;
  updated_at: string;
}

export interface FeatureVersion {
  id: string;
  feature_id: string;
  version_tag: string;
  snapshot_data: {
    feature: Feature;
    screens: ScreenItem[];
    nodes: JourneyNodeData[];
    edges: JourneyEdgeData[];
    knowledge: KnowledgeItem[];
    checkpoints: QACheckpoint[];
  };
  changelog: string | null;
  created_at: string;
}

export interface ScreenComparison {
  id: string;
  feature_id: string;
  screen_a_id: string;
  screen_b_id: string;
  diff_summary: string;
  detected_changes: {
    added_elements: string[];
    removed_elements: string[];
    modified_text: Array<{ before: string; after: string; element: string }>;
    state_change: { from: string; to: string };
    navigation_change?: string;
  };
  created_at: string;
}

export type CharterStatus = 'Draft' | 'In Progress' | 'Completed';
export type ScenarioStatus = 'Pass' | 'Fail' | 'Blocked' | 'Untested';

export type ScenarioCategory = 'Golden Path' | 'Alternative Flow' | 'Boundary & Edge' | 'Failure & Recovery';

export interface PromptTraceability {
  derived_from: {
    feature?: string[];
    journey?: string[];
    interaction?: string[];
    failure_state?: string[];
    risk?: string[];
  };
  exploration_dimensions: string[];
}

export interface CharterScenario {
  id: string;
  charter_id: string;
  prompt_id: string;
  prompt_text: string;
  status: ScenarioStatus;
  observations: string;
  media_url: string;
  sort_order: number;
  category?: ScenarioCategory;
  traceability?: PromptTraceability;
  created_at?: string;
  updated_at?: string;
}

export interface ValidationReport {
  passed: boolean;
  score: number;
  checks: {
    feature_scope: boolean;
    persona_relevant: boolean;
    journey_relevant: boolean;
    screenshot_grounded: boolean;
    business_rules_grounded: boolean;
    failure_states_considered: boolean;
    dependencies_considered: boolean;
    exploratory_not_scripted: boolean;
    duplicate_prompts: boolean;
    unsupported_claims: boolean;
    positive_golden_flow_covered: boolean;
  };
  notes?: string;
}

export interface VisualObservation {
  fact: string;
  source: 'screenshot' | 'blueprint' | 'inference';
  confidence: 'confirmed' | 'unknown';
}

export interface ControlledPersona {
  type: string;
  experience: string;
  goal: string;
  conditions: string[];
}

export interface ContextPack {
  feature_scope: {
    feature: string;
    feature_goal: string;
    scope: string[];
  };
  visual_evidence: Array<{
    screen_id: string;
    screen_name: string;
    visual_observations: VisualObservation[];
  }>;
  blueprint_dimensions: {
    features: string[];
    user_types: string[];
    journeys: string[];
    interactions: string[];
    business_rules: string[];
    failure_states: string[];
    dependencies: string[];
    historical_risks: string[];
  };
  persona: ControlledPersona;
  risk_profile: {
    critical_states: string[];
    interruption_points: string[];
    key_risks: string[];
  };
  exploration_dimensions: Array<{
    dimension: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    rationale: string;
  }>;
}

export interface QACharter {
  id: string;
  feature_id?: string | null;
  project_id: string;
  charter_code: string;
  title: string;
  mission: string;
  user_persona: string;
  starting_condition: string;
  expected_outcome: string;
  scope: 'feature' | 'product';
  status: CharterStatus;
  scenarios?: CharterScenario[];
  context_pack?: ContextPack;
  validation_report?: ValidationReport;
  created_at?: string;
  updated_at?: string;
}

export type GeneratedCharter = Omit<QACharter, 'id' | 'scenarios' | 'created_at' | 'updated_at'> & {
  scenarios: Array<Omit<CharterScenario, 'id' | 'charter_id' | 'created_at' | 'updated_at'>>;
};

export type TestRunStatus = 'in_progress' | 'completed';

export interface QATestRun {
  id: string;
  project_id: string;
  name: string;
  status: TestRunStatus;
  total_scenarios: number;
  passed_count: number;
  failed_count: number;
  blocked_count: number;
  untested_count: number;
  pass_rate: number;
  feature_ids: string[];
  metadata?: {
    featureNames?: string[];
    testerName?: string;
    environment?: string;
    platform?: string;
    scenario_results?: Record<string, {
      status: 'Untested' | 'Pass' | 'Fail' | 'Blocked';
      observations?: string;
      media_url?: string;
      executed_at?: string;
    }>;
    [key: string]: any;
  };
  started_at: string;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}



