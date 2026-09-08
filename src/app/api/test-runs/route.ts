import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

// GET: Fetch test runs for a project or all projects
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    let query = supabase
      .from('qa_test_runs')
      .select('*')
      .order('created_at', { ascending: false });

    if (projectId && projectId !== 'all') {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching qa_test_runs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, runs: data || [] });
  } catch (err: any) {
    console.error('Unexpected error in GET /api/test-runs:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, run: data });
  } catch (err: any) {
    console.error('Unexpected error in POST /api/test-runs:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH: Update test run progress and status
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const payload: Record<string, any> = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    if (updates.status === 'completed' && !updates.completed_at) {
      payload.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('qa_test_runs')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating qa_test_runs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, run: data });
  } catch (err: any) {
    console.error('Unexpected error in PATCH /api/test-runs:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Unexpected error in DELETE /api/test-runs:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
