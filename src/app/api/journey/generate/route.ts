import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { generateJourneyDAG } from '@/lib/ai/service';
import { Feature, ScreenItem } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { feature_id, api_key } = body;

    const { data: featureData, error: featErr } = await supabase
      .from('qa_features')
      .select('*')
      .eq('id', feature_id)
      .single();

    if (featErr || !featureData) {
      console.error('Feature fetch error in journey generate:', featErr);
      return NextResponse.json({ error: featErr?.message || 'Feature not found' }, { status: 404 });
    }

    const { data: screensData, error: scrErr } = await supabase
      .from('qa_screens')
      .select('*')
      .eq('feature_id', feature_id)
      .order('screen_number', { ascending: true });

    if (scrErr) {
      console.error('Screens fetch error in journey generate:', scrErr);
      return NextResponse.json({ error: scrErr.message || 'Failed to fetch screens' }, { status: 500 });
    }

    const feature = featureData as Feature;
    const screens = (screensData || []) as ScreenItem[];

    const { nodes, edges } = await generateJourneyDAG(feature, screens, api_key);

    // Clean existing nodes & edges for this feature
    await supabase.from('qa_journey_edges').delete().eq('feature_id', feature_id);
    await supabase.from('qa_journey_nodes').delete().eq('feature_id', feature_id);

    // Insert nodes
    if (nodes.length > 0) {
      const { error: nodeErr } = await supabase.from('qa_journey_nodes').insert(nodes);
      if (nodeErr) {
        console.error('Error inserting journey nodes:', nodeErr);
        return NextResponse.json({ error: `Failed to insert nodes: ${nodeErr.message}` }, { status: 500 });
      }
    }

    // Insert edges
    if (edges.length > 0) {
      const { error: edgeErr } = await supabase.from('qa_journey_edges').insert(edges);
      if (edgeErr) {
        console.error('Error inserting journey edges:', edgeErr);
        return NextResponse.json({ error: `Failed to insert edges: ${edgeErr.message}` }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, nodes, edges });
  } catch (err: any) {
    console.error('Error in /api/journey/generate:', err);
    return NextResponse.json({ error: err.message || 'Journey generation failed' }, { status: 500 });
  }
}
