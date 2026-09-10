import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { extractChartersFromExcel } from '@/lib/charters/excelCharterExtractor';
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
      return NextResponse.json({ 
        error: 'No file uploaded. Please upload an Excel spreadsheet (.xlsx, .xls) or Word document (.docx).' 
      }, { status: 400 });
    }

    const fileName = file.name || 'document.xlsx';
    const lowerName = fileName.toLowerCase();
    const isExcel = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls');
    const isWord = lowerName.endsWith('.docx');

    if (!isExcel && !isWord) {
      return NextResponse.json({ 
        error: 'Unsupported file format. Please upload an Excel spreadsheet (.xlsx, .xls) or Word document (.docx).' 
      }, { status: 400 });
    }

    // Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

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

    // Branch 1: Excel Spreadsheet Extraction
    if (isExcel) {
      const excelResult = extractChartersFromExcel(buffer, feature);

      if (excelResult.charters.length === 0) {
        return NextResponse.json({
          error: 'Could not detect any charters in the Excel file. Please ensure the sheet contains "Charter XX" headers or scenario tables with "Prompt ID".'
        }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        docName: fileName,
        fileType: 'excel',
        charters: excelResult.charters,
        extractionMode: 'deterministic',
        sheetNames: excelResult.sheetNames,
        totalScenarios: excelResult.totalScenarios
      });
    }

    // Branch 2: Word Document (.docx) Extraction
    const { markdown, rawText } = await extractTextFromDocx(buffer);

    if (!markdown && !rawText) {
      return NextResponse.json({
        error: 'The Word document appears to be empty or could not be parsed.'
      }, { status: 400 });
    }

    const textToAnalyze = markdown || rawText;
    const { charters, extractionMode } = await extractChartersFromDocument(
      textToAnalyze,
      feature,
      apiKey || undefined
    );

    return NextResponse.json({
      success: true,
      docName: fileName,
      fileType: 'word',
      charters,
      extractionMode,
      textLength: textToAnalyze.length,
      previewSnippet: textToAnalyze.slice(0, 500)
    });
  } catch (err: any) {
    console.error('Error extracting charters from document:', err);
    return NextResponse.json({ 
      error: err.message || 'Failed to process document.' 
    }, { status: 500 });
  }
}
