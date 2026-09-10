import mammoth from 'mammoth';
import { Feature, GeneratedCharter, QACharter, CharterScenario, ScenarioCategory } from '@/lib/types';
import { callGemini, getApiKey } from '@/lib/ai/service';

export interface DocxExtractionResult {
  markdown: string;
  rawText: string;
  charters: GeneratedCharter[];
  extractionMode: 'gemini' | 'deterministic';
}

/**
 * Extracts clean markdown and raw text from an uploaded .docx Buffer.
 */
export async function extractTextFromDocx(buffer: Buffer): Promise<{ markdown: string; rawText: string }> {
  const [mdResult, rawResult] = await Promise.all([
    (mammoth as any).convertToMarkdown({ buffer }),
    mammoth.extractRawText({ buffer })
  ]);

  return {
    markdown: mdResult.value?.trim() || '',
    rawText: rawResult.value?.trim() || ''
  };
}

/**
 * Fallback deterministic parser for when Gemini API key is unavailable or fails.
 * Scans markdown headings, bullet points, and numbered lists.
 */
export function buildDeterministicChartersFromText(
  text: string,
  feature?: Feature | null,
  docTitleFallback = 'Document Test Scope'
): GeneratedCharter[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const charters: GeneratedCharter[] = [];

  let currentTitle = feature?.name ? `${feature.name} Imported Charter` : docTitleFallback;
  let currentMission = 'Investigate key user flows, edge cases, and unexpected inputs documented in the specification.';
  let currentScenarios: Array<{ prompt_text: string; category: ScenarioCategory }> = [];
  let charterIndex = 1;

  for (const line of lines) {
    // Detect major headings (# Heading or ## Heading)
    if (line.startsWith('#') || line.startsWith('##')) {
      if (currentScenarios.length > 0) {
        charters.push({
          charter_code: `DOC-${String(charterIndex++).padStart(2, '0')}`,
          title: currentTitle,
          mission: currentMission,
          user_persona: feature?.user_types?.[0] || 'Customer',
          starting_condition: 'Application installed, launch from entry view',
          expected_outcome: 'System behaves as specified in requirements document',
          scope: 'feature',
          status: 'Active',
          scenarios: currentScenarios.map((s, sIdx) => ({
            prompt_id: `P-${sIdx + 1}`,
            prompt_text: s.prompt_text,
            category: s.category,
            status: 'Untested',
            observations: '',
            media_url: '',
            sort_order: sIdx
          }))
        });
        currentScenarios = [];
      }
      currentTitle = line.replace(/^#+\s*/, '').trim();
      currentMission = `Verify requirements, edge cases, and functionality under ${currentTitle}.`;
      continue;
    }

    // Detect bullet points or numbered lists
    if (/^[•\-\*]\s+/.test(line) || /^\d+[\.\)]\s+/.test(line)) {
      const promptText = line.replace(/^[•\-\*]\s+/, '').replace(/^\d+[\.\)]\s+/, '').trim();
      if (promptText.length > 3) {
        let category: ScenarioCategory = 'Golden Path';
        const lower = promptText.toLowerCase();
        if (lower.includes('error') || lower.includes('fail') || lower.includes('timeout') || lower.includes('crash')) {
          category = 'Failure & Recovery';
        } else if (lower.includes('invalid') || lower.includes('edge') || lower.includes('limit') || lower.includes('boundary')) {
          category = 'Boundary & Edge';
        } else if (lower.includes('cancel') || lower.includes('skip') || lower.includes('alternate')) {
          category = 'Alternative Flow';
        }

        currentScenarios.push({
          prompt_text: promptText,
          category
        });
      }
    }
  }

  // Push remaining scenarios
  if (currentScenarios.length > 0 || charters.length === 0) {
    charters.push({
      charter_code: `DOC-${String(charterIndex).padStart(2, '0')}`,
      title: currentTitle,
      mission: currentMission,
      user_persona: feature?.user_types?.[0] || 'Customer',
      starting_condition: 'Application installed, launch from entry view',
      expected_outcome: 'System behaves as specified in requirements document',
      scope: 'feature',
      status: 'Active',
      scenarios: (currentScenarios.length > 0 ? currentScenarios : [
        { prompt_text: 'Verify primary golden path workflow as described in document.', category: 'Golden Path' as ScenarioCategory },
        { prompt_text: 'Test with unexpected or blank field inputs to verify validation.', category: 'Boundary & Edge' as ScenarioCategory }
      ]).map((s, sIdx) => ({
        prompt_id: `P-${sIdx + 1}`,
        prompt_text: s.prompt_text,
        category: s.category,
        status: 'Untested',
        observations: '',
        media_url: '',
        sort_order: sIdx
      }))
    });
  }

  return charters;
}

/**
 * Extracts and synthesizes structured QA charters from Word document content using Gemini AI.
 */
export async function extractChartersFromDocument(
  markdownText: string,
  feature?: Feature | null,
  apiKey?: string
): Promise<{ charters: GeneratedCharter[]; extractionMode: 'gemini' | 'deterministic' }> {
  if (!markdownText || markdownText.trim().length === 0) {
    return {
      charters: [],
      extractionMode: 'deterministic'
    };
  }

  const effectiveKey = apiKey || getApiKey();

  if (!effectiveKey) {
    const charters = buildDeterministicChartersFromText(markdownText, feature);
    return { charters, extractionMode: 'deterministic' };
  }

  const prompt = `You are a Principal QA Lead and Exploratory Testing Specialist.
Analyze the following test plan, requirements specification, or test charter document (uploaded from a Word .docx file):

============================================================
DOCUMENT CONTENT:
============================================================
${markdownText.slice(0, 45000)}

============================================================
INSTRUCTIONS:
============================================================
1. Extract distinct, cohesive Exploratory Testing Charters from this document.
   - If the document covers multiple distinct features or flows, split into 2 to 5 targeted charters.
   - If the document is focused on one feature, generate 1 to 2 detailed charters.
2. For each charter:
   - "charter_code": e.g. "DOC-01", "DOC-02", etc.
   - "title": Clean descriptive title (e.g. "Authentication & OTP Verification").
   - "mission": An investigative, risk-focused mission statement explaining what to hunt for.
   - "user_persona": Persona relevant to the flow (e.g. "Customer", "Admin", "First-time User").
   - "starting_condition": State or prerequisites needed to begin exploration.
   - "expected_outcome": Normal expected outcome or success criteria.
   - "scenarios": Array of concrete test prompts/heuristics to investigate.
     For each scenario:
     * "prompt_id": e.g. "P-1", "P-2", etc.
     * "prompt_text": Clear, actionable test scenario or heuristic challenge.
     * "category": Choose one of: "Golden Path", "Alternative Flow", "Boundary & Edge", "Failure & Recovery"
     * "status": "Untested"
     * "sort_order": index number

Return STRICT JSON only matching this format:
{
  "charters": [
    {
      "charter_code": "DOC-01",
      "title": "...",
      "mission": "...",
      "user_persona": "...",
      "starting_condition": "...",
      "expected_outcome": "...",
      "scope": "feature",
      "status": "Active",
      "scenarios": [
        {
          "prompt_id": "P-1",
          "prompt_text": "...",
          "category": "Golden Path",
          "status": "Untested",
          "observations": "",
          "media_url": "",
          "sort_order": 0
        }
      ]
    }
  ]
}`;

  try {
    const aiResponse = await callGemini(
      prompt,
      'You are a senior QA Test Architect that extracts structured Exploratory Testing charters and scenarios from specifications. Output valid JSON only.',
      effectiveKey
    );

    if (aiResponse) {
      let cleaned = aiResponse.trim();
      if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');

      const parsed = JSON.parse(cleaned);
      if (parsed && Array.isArray(parsed.charters) && parsed.charters.length > 0) {
        const validatedCharters: GeneratedCharter[] = parsed.charters.map((c: any, idx: number) => ({
          charter_code: c.charter_code || `DOC-${String(idx + 1).padStart(2, '0')}`,
          title: c.title || `Imported Charter ${idx + 1}`,
          mission: c.mission || 'Investigate functionality and failure recovery states.',
          user_persona: c.user_persona || feature?.user_types?.[0] || 'Customer',
          starting_condition: c.starting_condition || 'Application launched and ready',
          expected_outcome: c.expected_outcome || 'System performs expected operations gracefully',
          scope: 'feature',
          status: 'Active',
          scenarios: Array.isArray(c.scenarios) ? c.scenarios.map((s: any, sIdx: number) => ({
            prompt_id: s.prompt_id || `P-${sIdx + 1}`,
            prompt_text: s.prompt_text || String(s),
            category: (['Golden Path', 'Alternative Flow', 'Boundary & Edge', 'Failure & Recovery'].includes(s.category)
              ? s.category 
              : 'Golden Path') as ScenarioCategory,
            status: 'Untested',
            observations: '',
            media_url: '',
            sort_order: sIdx
          })) : []
        }));

        return {
          charters: validatedCharters,
          extractionMode: 'gemini'
        };
      }
    }
  } catch (err) {
    console.warn('Gemini charter extraction failed, falling back to deterministic parser:', err);
  }

  // Fallback if AI fails or returns invalid schema
  const fallbackCharters = buildDeterministicChartersFromText(markdownText, feature);
  return {
    charters: fallbackCharters,
    extractionMode: 'deterministic'
  };
}
