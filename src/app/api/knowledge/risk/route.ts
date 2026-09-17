import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { resolveFeatureRecord } from '@/lib/mcp/engine/aiEngine';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      feature: featureParam,
      feature_id,
      name,
      title,
      description,
      screen_reference,
      evidence_url,
      reported_by,
      severity
    } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Missing required field: "title" (concise defect summary).'
      }, { status: 400, headers: CORS_HEADERS });
    }

    if (!description || typeof description !== 'string' || !description.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Missing required field: "description" (symptoms, observation, and expected vs actual behavior).'
      }, { status: 400, headers: CORS_HEADERS });
    }

    // 1. Resolve feature by name, UUID, or "latest"
    const targetIdentifier = (featureParam || feature_id || name || 'latest').trim();
    const feature = await resolveFeatureRecord(targetIdentifier);

    // 2. Query existing items in Pillar #8 for this feature to check for duplicates
    const { data: existingItems } = await supabase
      .from('qa_knowledge_items')
      .select('*')
      .eq('feature_id', feature.id)
      .eq('category', 'Historical Knowledge & Risk');

    const cleanTitle = title.trim();
    const normalizedNewTitle = cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Check if an existing item has an identical or very similar title
    const existingMatch = (existingItems || []).find(item => {
      const existingNormalized = (item.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return (
        existingNormalized.includes(normalizedNewTitle) ||
        normalizedNewTitle.includes(existingNormalized) ||
        existingNormalized === normalizedNewTitle
      );
    });

    let resultItemId = '';
    let actionTaken: 'created' | 'merged' = 'created';

    if (existingMatch) {
      // Deduplication: merge follow-up note into existing knowledge item
      actionTaken = 'merged';
      resultItemId = existingMatch.id;

      const dateStamp = new Date().toLocaleDateString();
      const followUpText = `\n\n[FOLLOW-UP INQUIRY ${dateStamp}]:\n${description.trim()}${screen_reference ? ` (Screen: ${screen_reference.trim()})` : ''}${evidence_url ? `\nEvidence Proof: ${evidence_url.trim()}` : ''}`;
      const updatedContent = `${existingMatch.content || ''}${followUpText}`;

      await supabase
        .from('qa_knowledge_items')
        .update({
          content: updatedContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingMatch.id);
    } else {
      // Create new knowledge item in Pillar #8
      actionTaken = 'created';
      const formattedTitle = cleanTitle.startsWith('[') ? cleanTitle : `[Defect Report] ${cleanTitle}`;
      
      let formattedContent = description.trim();
      if (screen_reference) {
        formattedContent += `\nAffected Screen / Journey Area: ${screen_reference.trim()}`;
      }
      if (severity) {
        formattedContent += `\nReported Severity: ${severity.toUpperCase()}`;
      }
      if (evidence_url) {
        formattedContent += `\nScreenshot / Evidence URL: ${evidence_url.trim()}`;
      }

      const auditNote = `Reported via ChatGPT by ${reported_by || 'Executive User'} on ${new Date().toISOString()}${evidence_url ? ` | Proof: ${evidence_url.trim()}` : ''}`;

      const { data: inserted, error: insertError } = await supabase
        .from('qa_knowledge_items')
        .insert({
          feature_id: feature.id,
          category: 'Historical Knowledge & Risk',
          title: formattedTitle,
          content: formattedContent,
          source: 'User',
          confidence: 'CONFIRMED',
          verification_status: 'Needs Confirmation',
          notes: auditNote
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed inserting defect into database: ${insertError.message}`);
      }

      resultItemId = inserted?.id || '';
    }

    // 3. Update executive context in qa_features so Storyboard Blueprint card reflects it
    try {
      const advCtx = (feature.advanced_context as any) || {};
      const execCtx = advCtx.executive_context || {};
      const currentRisk = execCtx.historicalKnowledgeRisk || '';
      const newEntry = `[${cleanTitle}] ${description.trim()}${screen_reference ? ` (${screen_reference.trim()})` : ''}`;
      const updatedRisk = currentRisk ? `${currentRisk}; ${newEntry}` : newEntry;

      await supabase
        .from('qa_features')
        .update({
          advanced_context: {
            ...advCtx,
            executive_context: {
              ...execCtx,
              historicalKnowledgeRisk: updatedRisk
            }
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', feature.id);
    } catch (featErr) {
      console.warn('Could not update qa_features advanced_context:', featErr);
    }

    return NextResponse.json({
      success: true,
      feature_id: feature.id,
      feature_name: feature.name,
      item_id: resultItemId,
      action: actionTaken,
      message: actionTaken === 'merged'
        ? `Successfully merged follow-up observation into existing defect "${cleanTitle}" under Pillar #8.`
        : `Successfully recorded defect "${cleanTitle}" in Pillar #8 (Historical Knowledge & Risks) for "${feature.name}".`
    }, {
      headers: CORS_HEADERS
    });
  } catch (err: any) {
    console.error('Error recording defect in Pillar #8:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Failed to record defect in Pillar #8.'
    }, {
      status: 500,
      headers: CORS_HEADERS
    });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS
  });
}
