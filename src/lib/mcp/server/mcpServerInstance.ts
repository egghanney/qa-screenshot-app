import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { 
  getFeatureContextPack, 
  analyzeFeature, 
  generateChartersForFeature, 
  analyzeFindings, 
  generateFollowUpCharters 
} from '../engine/aiEngine';
import { validateCharterSuite } from '../validation/charterQualityGate';
import { supabase } from '@/lib/supabase/client';
import { Charter, ExecutionResults, ExecutionResultsSchema } from '../contracts/schemas';

// PII & Secret Sanitizer to prevent leaking sensitive credentials in MCP responses
export function sanitizeOutput(content: string): string {
  if (!content) return content;
  return content
    .replace(/(sk-[a-zA-Z0-9_-]{20,})/g, '[REDACTED_API_KEY]')
    .replace(/(bearer\s+[a-zA-Z0-9._-]{20,})/gi, 'Bearer [REDACTED_TOKEN]')
    .replace(/(\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b)/g, '[REDACTED_CARD_NUMBER]')
    .replace(/(\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b)/g, '[REDACTED_EMAIL]');
}

/**
 * Creates and configures the standard QA Exploratory Testing MCP Server
 * with 7 Tools, 7 Resources, and 6 Prompts.
 */
export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'qa-exploratory-testing',
    version: '1.0.0'
  });

  // ==========================================
  // 1. THE 7 PRIMARY MCP TOOLS
  // ==========================================

  // Tool 1: get_context_pack
  server.tool(
    'get_context_pack',
    'Retrieve the complete structured Feature Context Pack including 8 Blueprint Pillars, ordered User Actions, Screen Evidence, and Normalized Evidence Index.',
    {
      feature_id: z.string().describe('The unique ID of the QA feature')
    },
    async ({ feature_id }) => {
      try {
        const pack = await getFeatureContextPack(feature_id);
        return {
          content: [
            {
              type: 'text',
              text: sanitizeOutput(JSON.stringify(pack, null, 2))
            }
          ]
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to get context pack: ${err.message}` }]
        };
      }
    }
  );

  // Tool 2: analyze_feature
  server.tool(
    'analyze_feature',
    'Perform in-depth behavioral analysis on a feature, deriving topological journeys, states, boundaries, cross-screen data consistency, and sourced risks.',
    {
      feature_id: z.string().describe('The unique ID of the QA feature')
    },
    async ({ feature_id }) => {
      try {
        const analysis = await analyzeFeature(feature_id);
        return {
          content: [
            {
              type: 'text',
              text: sanitizeOutput(JSON.stringify(analysis, null, 2))
            }
          ]
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to analyze feature: ${err.message}` }]
        };
      }
    }
  );

  // Tool 3: generate_charters
  server.tool(
    'generate_charters',
    'Generate focused exploratory testing charters grounded 100% in feature evidence, blueprint pillars, and risk vectors with strict traceability.',
    {
      feature_id: z.string().describe('The unique ID of the QA feature'),
      count: z.number().min(1).max(10).optional().describe('Number of charters to generate (default 4)'),
      idempotency_key: z.string().optional().describe('Optional idempotency key to prevent duplicate runs'),
      model: z.string().optional().describe('Optional AI model override (e.g. gpt-4o or gemini-3.6-flash)'),
      multimodal: z.boolean().optional().describe('Enable multimodal vision inspection of actual screen screenshots (default false)')
    },
    async ({ feature_id, count, idempotency_key, model, multimodal }) => {
      try {
        const result = await generateChartersForFeature(feature_id, {
          count,
          idempotencyKey: idempotency_key,
          model,
          multimodal
        });

        return {
          content: [
            {
              type: 'text',
              text: sanitizeOutput(JSON.stringify({
                charter_suite: result.charterSuite,
                quality_gate_report: result.qualityGateReport,
                engine: result.engine
              }, null, 2))
            }
          ]
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to generate charters: ${err.message}` }]
        };
      }
    }
  );

  // Tool 4: validate_charters
  server.tool(
    'validate_charters',
    'Run the deterministic 9-check code quality gate on candidate charters against the feature\'s evidence index.',
    {
      feature_id: z.string().describe('The unique ID of the QA feature'),
      charters_json: z.string().describe('JSON string of candidate Charter[] array')
    },
    async ({ feature_id, charters_json }) => {
      try {
        const contextPack = await getFeatureContextPack(feature_id);
        const charters = JSON.parse(charters_json) as Charter[];
        const report = validateCharterSuite(charters, contextPack);

        return {
          content: [
            {
              type: 'text',
              text: sanitizeOutput(JSON.stringify(report, null, 2))
            }
          ]
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Validation failed: ${err.message}` }]
        };
      }
    }
  );

  // Tool 5: get_execution_results
  server.tool(
    'get_execution_results',
    'Fetch recent test execution results, observations, failures, and blocked scenarios for a feature.',
    {
      feature_id: z.string().describe('The unique ID of the QA feature')
    },
    async ({ feature_id }) => {
      try {
        const { data: runs, error } = await supabase
          .from('qa_test_runs')
          .select('*')
          .contains('feature_ids', [feature_id])
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;

        const observations: string[] = [];
        const issues: string[] = [];
        const blockedItems: string[] = [];
        const promptResults: any[] = [];

        (runs || []).forEach(run => {
          const results = run.metadata?.scenario_results || {};
          Object.entries(results).forEach(([promptId, r]: [string, any]) => {
            promptResults.push({
              prompt_id: promptId,
              status: r.status,
              observation: r.observations || '',
              media_urls: r.media_url ? [r.media_url] : [],
              timestamp: r.executed_at || run.created_at
            });

            if (r.status === 'Fail') issues.push(`[${promptId}] ${r.observations}`);
            if (r.status === 'Blocked') blockedItems.push(`[${promptId}] ${r.observations}`);
            if (r.observations) observations.push(r.observations);
          });
        });

        const executionResults: ExecutionResults = {
          charter_id: 'aggregate',
          feature_id,
          prompts: promptResults,
          observations,
          issues,
          blocked_items: blockedItems,
          new_unknowns: []
        };

        return {
          content: [
            {
              type: 'text',
              text: sanitizeOutput(JSON.stringify(executionResults, null, 2))
            }
          ]
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to fetch execution results: ${err.message}` }]
        };
      }
    }
  );

  // Tool 6: analyze_findings
  server.tool(
    'analyze_findings',
    'Analyze tester findings and observations to identify regressions, blocked paths, and newly discovered unknowns.',
    {
      feature_id: z.string().describe('The unique ID of the QA feature'),
      findings_json: z.string().describe('JSON string conforming to ExecutionResults')
    },
    async ({ feature_id, findings_json }) => {
      try {
        const parsed = JSON.parse(findings_json);
        const findings = ExecutionResultsSchema.parse(parsed);
        const analysis = await analyzeFindings(feature_id, findings);

        return {
          content: [
            {
              type: 'text',
              text: sanitizeOutput(JSON.stringify(analysis, null, 2))
            }
          ]
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to analyze findings: ${err.message}` }]
        };
      }
    }
  );

  // Tool 7: generate_follow_up_charters
  server.tool(
    'generate_follow_up_charters',
    'Generate targeted follow-up charters to isolate bugs, verify state recovery, or investigate blocked paths.',
    {
      feature_id: z.string().describe('The unique ID of the QA feature'),
      failed_scenarios_json: z.string().describe('JSON array of { charter_id, prompt_id, observation }')
    },
    async ({ feature_id, failed_scenarios_json }) => {
      try {
        const failedItems = JSON.parse(failed_scenarios_json);
        const followUps = await generateFollowUpCharters(feature_id, failedItems);

        return {
          content: [
            {
              type: 'text',
              text: sanitizeOutput(JSON.stringify(followUps, null, 2))
            }
          ]
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to generate follow-up charters: ${err.message}` }]
        };
      }
    }
  );

  // ==========================================
  // 2. THE 7 MCP RESOURCES
  // ==========================================

  // Resource 1: qa://features/{featureId}/context_pack
  server.resource(
    'feature_context_pack',
    new ResourceTemplate('qa://features/{featureId}/context_pack', { list: undefined }),
    async (uri, { featureId }) => {
      const pack = await getFeatureContextPack(featureId as string);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: sanitizeOutput(JSON.stringify(pack, null, 2))
          }
        ]
      };
    }
  );

  // Resource 2: qa://features/{featureId}/blueprint
  server.resource(
    'feature_blueprint',
    new ResourceTemplate('qa://features/{featureId}/blueprint', { list: undefined }),
    async (uri, { featureId }) => {
      const pack = await getFeatureContextPack(featureId as string);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: sanitizeOutput(JSON.stringify(pack.framework, null, 2))
          }
        ]
      };
    }
  );

  // Resource 3: qa://features/{featureId}/screens
  server.resource(
    'feature_screens',
    new ResourceTemplate('qa://features/{featureId}/screens', { list: undefined }),
    async (uri, { featureId }) => {
      const pack = await getFeatureContextPack(featureId as string);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: sanitizeOutput(JSON.stringify({ screens: pack.screens, user_actions: pack.user_actions }, null, 2))
          }
        ]
      };
    }
  );

  // Resource 4: qa://features/{featureId}/analysis
  server.resource(
    'feature_analysis',
    new ResourceTemplate('qa://features/{featureId}/analysis', { list: undefined }),
    async (uri, { featureId }) => {
      const analysis = await analyzeFeature(featureId as string);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: sanitizeOutput(JSON.stringify(analysis, null, 2))
          }
        ]
      };
    }
  );

  // Resource 5: qa://features/{featureId}/evidence_index
  server.resource(
    'feature_evidence_index',
    new ResourceTemplate('qa://features/{featureId}/evidence_index', { list: undefined }),
    async (uri, { featureId }) => {
      const pack = await getFeatureContextPack(featureId as string);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: sanitizeOutput(JSON.stringify(pack.evidence_index, null, 2))
          }
        ]
      };
    }
  );

  // Resource 6: qa://features/{featureId}/charters
  server.resource(
    'feature_charters',
    new ResourceTemplate('qa://features/{featureId}/charters', { list: undefined }),
    async (uri, { featureId }) => {
      const { data: charters } = await supabase
        .from('qa_charters')
        .select('*, qa_charter_scenarios(*)')
        .eq('feature_id', featureId as string)
        .order('created_at', { ascending: true });

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: sanitizeOutput(JSON.stringify(charters || [], null, 2))
          }
        ]
      };
    }
  );

  // Resource 7: qa://features/{featureId}/test_runs
  server.resource(
    'feature_test_runs',
    new ResourceTemplate('qa://features/{featureId}/test_runs', { list: undefined }),
    async (uri, { featureId }) => {
      const { data: runs } = await supabase
        .from('qa_test_runs')
        .select('*')
        .contains('feature_ids', [featureId as string])
        .order('created_at', { ascending: false });

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: sanitizeOutput(JSON.stringify(runs || [], null, 2))
          }
        ]
      };
    }
  );

  // ==========================================
  // 3. THE 6 MCP PROMPTS
  // ==========================================

  // Prompt 1: explore_feature
  server.prompt(
    'explore_feature',
    'Exploratory testing mission prompt targeting core user journeys and high-impact risks.',
    {
      feature_id: z.string().describe('ID of the feature to explore'),
      focus_area: z.string().optional().describe('Specific focus area or user persona')
    },
    ({ feature_id, focus_area }) => ({
      description: `Exploratory prompt for feature ${feature_id}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please explore feature "${feature_id}"${focus_area ? ` focusing on "${focus_area}"` : ''}. Identify all critical state transitions, boundaries, and potential error modes grounded strictly in the 8 Blueprint Pillars.`
          }
        }
      ]
    })
  );

  // Prompt 2: stress_boundaries
  server.prompt(
    'stress_boundaries',
    'Stress testing prompt targeting boundary limits, currency extremes, and input validation.',
    {
      feature_id: z.string().describe('ID of the feature to stress test')
    },
    ({ feature_id }) => ({
      description: `Boundary stress testing prompt for feature ${feature_id}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Analyze feature "${feature_id}" and test all input boundaries, minimum/maximum thresholds, special characters, and balance overflows. Verify informative validation messaging.`
          }
        }
      ]
    })
  );

  // Prompt 3: audit_failure_states
  server.prompt(
    'audit_failure_states',
    'Failure injection and recovery prompt targeting network interruptions and double-debit risks.',
    {
      feature_id: z.string().describe('ID of the feature to audit for failure states')
    },
    ({ feature_id }) => ({
      description: `Failure audit prompt for feature ${feature_id}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Examine failure modes for feature "${feature_id}". Test rapid multiple button clicks, network drops during transaction processing, app back gestures, and session timeouts.`
          }
        }
      ]
    })
  );

  // Prompt 4: verify_data_consistency
  server.prompt(
    'verify_data_consistency',
    'Prompt to inspect data consistency of amounts, recipients, and references across screen lifecycles.',
    {
      feature_id: z.string().describe('ID of the feature to inspect')
    },
    ({ feature_id }) => ({
      description: `Data consistency inspection prompt for feature ${feature_id}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Verify data consistency across all screens of feature "${feature_id}" from input, confirmation, processing, success, receipt, to notification. Identify any value mismatches or truncated fields.`
          }
        }
      ]
    })
  );

  // Prompt 5: critique_charters
  server.prompt(
    'critique_charters',
    'Prompt to evaluate candidate charters against the 9-layer quality gate.',
    {
      feature_id: z.string().describe('ID of the feature')
    },
    ({ feature_id }) => ({
      description: `Quality gate critique prompt for feature ${feature_id}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Evaluate candidate exploratory charters for feature "${feature_id}". Audit prompt traceability, evidence grounding, absence of click-scripts, and unknown integrity.`
          }
        }
      ]
    })
  );

  // Prompt 6: investigate_defect
  server.prompt(
    'investigate_defect',
    'Prompt to investigate a reported defect or blocked scenario and formulate follow-up exploration.',
    {
      feature_id: z.string().describe('ID of the feature'),
      observation: z.string().describe('The observed bug or blocked behavior')
    },
    ({ feature_id, observation }) => ({
      description: `Defect investigation prompt for feature ${feature_id}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `A defect was observed on feature "${feature_id}": "${observation}". Formulate a focused follow-up exploratory charter to isolate the defect, test recovery, and check adjacent states.`
          }
        }
      ]
    })
  );

  return server;
}
