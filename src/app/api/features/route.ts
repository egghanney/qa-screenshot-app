import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Concurrently query all features and all applications in parallel
    const [featuresRes, projectsRes] = await Promise.all([
      supabase
        .from('qa_features')
        .select('id, project_id, name, purpose, created_at, updated_at, qa_screens(id)')
        .order('created_at', { ascending: false }),
      supabase
        .from('qa_projects')
        .select('id, name, description, platform, created_at, updated_at')
        .order('name', { ascending: true })
    ]);

    if (featuresRes.error) {
      return NextResponse.json({ error: featuresRes.error.message }, { status: 500 });
    }

    const projects = projectsRes.data || [];
    const projectMap = new Map<string, { id: string; name: string; platform?: string; description?: string }>();
    projects.forEach((p: any) => {
      projectMap.set(p.id, {
        id: p.id,
        name: p.name || 'Untitled Application',
        platform: p.platform || 'Mobile',
        description: p.description || ''
      });
    });

    // Enrich each feature with its parent application context
    const enrichedFeatures = (featuresRes.data || []).map((f: any) => {
      const proj = f.project_id ? projectMap.get(f.project_id) : undefined;
      return {
        id: f.id,
        name: f.name || 'Untitled Feature',
        purpose: f.purpose || '',
        screen_count: Array.isArray(f.qa_screens) ? f.qa_screens.length : 0,
        app_id: proj?.id || f.project_id || null,
        app_name: proj?.name || 'Default Application',
        platform: proj?.platform || 'Mobile',
        created_at: f.created_at,
        updated_at: f.updated_at
      };
    });

    // Build the hierarchical applications list grouping features
    const appGroupMap = new Map<string, any>();
    projects.forEach((p: any) => {
      appGroupMap.set(p.id, {
        id: p.id,
        name: p.name || 'Untitled Application',
        platform: p.platform || 'Mobile',
        description: p.description || '',
        total_features: 0,
        total_screens: 0,
        features: []
      });
    });

    enrichedFeatures.forEach(feat => {
      const appId = feat.app_id || 'unassigned';
      if (!appGroupMap.has(appId)) {
        appGroupMap.set(appId, {
          id: appId,
          name: feat.app_name || 'General Application',
          platform: feat.platform || 'Mobile',
          description: '',
          total_features: 0,
          total_screens: 0,
          features: []
        });
      }
      const app = appGroupMap.get(appId)!;
      app.total_features += 1;
      app.total_screens += feat.screen_count;
      app.features.push({
        id: feat.id,
        name: feat.name,
        purpose: feat.purpose,
        screen_count: feat.screen_count
      });
    });

    const applications = Array.from(appGroupMap.values()).filter(app => app.total_features > 0);

    return NextResponse.json({
      success: true,
      total_applications: applications.length,
      total_features: enrichedFeatures.length,
      total: enrichedFeatures.length,
      applications,
      features: enrichedFeatures
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
