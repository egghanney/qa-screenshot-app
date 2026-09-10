import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { extractTextFromDocx, extractChartersFromDocument } from '@/lib/charters/docxCharterExtractor';
import { Feature } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const featureId = formData.get('feature_id') as string | null;
    const projectId = formData.get('project_id') as string | null;
    const apiKey = formData.get('api_key') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded. Please upload a Word (.docx) document.' }, { status: 400 });
    }

    const fileName = file.name || 'document.docx';
    if (!fileName.toLowerCase().endsWith('.docx')) {
      return NextResponse.json({ 
        error: 'Unsupported file format. Please upload a modern Word document (.docx format).' 
      }, { status: 400 });
    }

    // Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text & markdown using mammoth
    const { markdown, rawText } = await extractTextFromDocx(buffer);

    if (!markdown && !rawText) {
      return NextResponse.json({
        error: 'The Word document appears to be empty or could not be parsed.'
      }, { status: 400 });
    }

    // Fetch feature context if featureId is provided
    let feature: Feature | null = null;
    if (featureId) {
      const { data: featData } = await supabase
        .from('qa_features')
        .select('*')
        .eq('id', featureId)
        .single();
      if (featData) {
        feature = featData as Feature;
      }
    }

    // Extract structured charters via AI (with deterministic fallback)
    const textToAnalyze = markdown || rawText;
    const { charters, extractionMode } = await extractChartersFromDocument(
      textToAnalyze,
      feature,
      apiKey || undefined
    );

    return NextResponse.json({
      success: true,
      docName: fileName,
      charters,
      extractionMode,
      textLength: textToAnalyze.length,
      previewSnippet: textToAnalyze.slice(0, 500)
    });
  } catch (err: any) {
    console.error('Error extracting charters from Word document:', err);
    return NextResponse.json({ 
      error: err.message || 'Failed to process Word document.' 
    }, { status: 500 });
  }
}
