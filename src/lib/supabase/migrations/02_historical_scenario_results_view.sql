-- Migration: 02_historical_scenario_results_view.sql
-- Description: Create SQL view v_historical_scenario_results to unnest test run scenario results from qa_test_runs JSONB metadata.

CREATE OR REPLACE VIEW public.v_historical_scenario_results AS
SELECT 
  r.id AS run_id,
  r.project_id,
  r.name AS run_name,
  r.status AS run_status,
  r.created_at AS run_created_at,
  r.completed_at AS run_completed_at,
  r.started_at AS run_started_at,
  r.metadata->>'environment' AS environment,
  r.metadata->>'platform' AS platform,
  s.key AS scenario_id,
  s.value->>'status' AS status,
  s.value->>'observations' AS observations,
  s.value->>'media_url' AS media_url,
  s.value->>'executed_at' AS executed_at
FROM public.qa_test_runs r,
LATERAL jsonb_each(COALESCE(r.metadata->'scenario_results', '{}'::jsonb)) AS s;

-- Comment for documentation
COMMENT ON VIEW public.v_historical_scenario_results IS 
'Relational view unnesting frozen scenario execution results from qa_test_runs.metadata JSONB. Enables standard SQL JOINs, GROUP BYs, and aggregations.';
