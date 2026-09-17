import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

// GET: Fetch test runs with optional feature, project, and limit filters
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const featureParam = (searchParams.get('feature') || searchParams.get('feature_id'))?.trim();
    const limitParam = parseInt(searchParams.get('limit') || '20', 10);
    const limit = Math.min(Math.max(1, isNaN(limitParam) ? 20 : limitParam), 100);
    const includeCharters = searchParams.get('include_charters') === 'true';

    let query = supabase
      .from('qa_test_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (projectId && projectId !== 'all') {
      query = query.eq('project_id', projectId);
    }

    if (featureParam) {
      // Find feature by UUID or name
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(featureParam);
      let targetId = isUuid ? featureParam : null;

      if (!targetId) {
        const { data: feat } = await supabase
          .from('qa_features')
          .select('id')
          .ilike('name', `%${featureParam}%`)
          .limit(1)
          .maybeSingle();
        if (feat?.id) {
          targetId = feat.id;
        }
      }

      if (targetId) {
        query = query.contains('feature_ids', JSON.stringify([targetId]));
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching qa_test_runs:', error);
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }

    // By default, strip the heavy charters_snapshot from list responses so ChatGPT/clients stay lightweight & fast
    const sanitizedRuns = (data || []).map(r => {
      if (!includeCharters && r.metadata && r.metadata.charters_snapshot) {
        const { charters_snapshot, ...restMeta } = r.metadata;
        return {
          ...r,
          metadata: {
            ...restMeta,
            charters_snapshot_count: Array.isArray(charters_snapshot) ? charters_snapshot.length : 0
          }
        };
      }
      return r;
    });

    return NextResponse.json({ 
      success: true, 
      total: sanitizedRuns.length,
      runs: sanitizedRuns 
    }, { headers: corsHeaders });
  } catch (err: any) {
    console.error('Unexpected error in GET /api/test-runs:', err);
    return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
}

// POST: Create a new test run record
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      project_id,
      name,
      feature_ids = [],
      total_scenarios = 0,
      metadata = {}
    } = body;

    if (!project_id || !name) {
      return NextResponse.json(
        { error: 'project_id and name are required' },
        { status: 400 }
      );
    }

    const newRun = {
      project_id,
      name,
      status: 'in_progress',
      total_scenarios,
      passed_count: 0,
      failed_count: 0,
      blocked_count: 0,
      untested_count: total_scenarios,
      pass_rate: 0,
      feature_ids,
      metadata,
      started_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('qa_test_runs')
      .insert(newRun)
      .select('*')
      .single();

    if (error) {
      console.error('Error creating qa_test_runs:', error);
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ success: true, run: data }, { headers: corsHeaders });
  } catch (err: any) {
    console.error('Unexpected error in POST /api/test-runs:', err);
    return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
}

// PATCH: Update test run progress and status
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400, headers: corsHeaders });
    }

    const payload: Record<string, any> = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    if (updates.status === 'completed' && !updates.completed_at) {
      payload.completed_at = new Date().toISOString();
    }

    if (updates.metadata) {
      try {
        const { data: currentRun } = await supabase
          .from('qa_test_runs')
          .select('metadata')
          .eq('id', id)
          .single();

        const existingMeta = currentRun?.metadata || {};
        const mergedScenarioResults = {
          ...(existingMeta.scenario_results || {}),
          ...(updates.metadata.scenario_results || {})
        };

        payload.metadata = {
          ...existingMeta,
          ...updates.metadata,
          scenario_results: mergedScenarioResults
        };
      } catch (metaErr) {
        console.warn('Could not merge metadata, using raw updates.metadata:', metaErr);
      }
    }

    const { data, error } = await supabase
      .from('qa_test_runs')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating qa_test_runs:', error);
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ success: true, run: data }, { headers: corsHeaders });
  } catch (err: any) {
    console.error('Unexpected error in PATCH /api/test-runs:', err);
    return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
}

// DELETE: Remove a test run record
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('qa_test_runs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting qa_test_runs:', error);
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (err: any) {
    console.error('Unexpected error in DELETE /api/test-runs:', err);
    return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
}
