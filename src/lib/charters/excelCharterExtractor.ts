import * as XLSX from 'xlsx';
import { Feature, GeneratedCharter, ScenarioCategory, ScenarioStatus } from '@/lib/types';

export interface ExcelExtractionResult {
  charters: GeneratedCharter[];
  sheetNames: string[];
  totalScenarios: number;
}

/**
 * Checks if a string is auxiliary metadata, a comment, note, URL, or boundary label
 * that should NEVER be captured as a scenario prompt.
 */
function isNonScenarioText(text: string): boolean {
  if (!text) return true;
  const t = text.trim().toLowerCase();
  if (t.length === 0) return true;

  // Standalone URLs
  if (/^https?:\/\//i.test(t) || /^www\./i.test(t)) return true;

  // Metadata, comment, note, or section headers
  if (
    /^(comment|comments|note|notes|media|media\s*url|evidence|follow-up|traceability|screens?|screenshots?|assumptions?|out\s*of\s*scope|risk|risks|tester|date|author|reviewed\s*by|status|observations?|prompt\s*id|promptid)\s*[:—\-]/i.test(
      t
    )
  ) {
    return true;
  }

  // Exact standalone section labels
  if (
    /^(comments?|notes?|media|media\s*urls?|evidence|follow-up|traceability|risks?|prompt\s*id|promptid|status|observations?\s*&\s*notes?)$/i.test(
      t
    )
  ) {
    return true;
  }

  return false;
}

/**
 * Extracts structured QA charters and scenarios from an Excel (.xlsx / .xls) buffer.
 * Supports vertically stacked charters within a single sheet and multi-tab workbooks.
 * Discards all auxiliary notes, comments, media URLs, and stray cells.
 */
export function extractChartersFromExcel(
  buffer: Buffer,
  feature?: Feature | null
): ExcelExtractionResult {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const allCharters: GeneratedCharter[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    // Convert sheet to a 2D array of cell string values
    const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (!rawRows || rawRows.length === 0) continue;

    const sheetCharters = parseSheetRows(rawRows, sheetName, feature);
    allCharters.push(...sheetCharters);
  }

  // Ensure unique charter codes if any were omitted
  allCharters.forEach((c, idx) => {
    if (!c.charter_code || c.charter_code.trim() === '') {
      c.charter_code = `EXCEL-${String(idx + 1).padStart(2, '0')}`;
    }
  });

  const totalScenarios = allCharters.reduce((acc, c) => acc + (c.scenarios?.length || 0), 0);

  return {
    charters: allCharters,
    sheetNames: workbook.SheetNames,
    totalScenarios
  };
}

interface ColumnMap {
  promptIdCol: number;
  promptTextCol: number;
  statusCol: number;
  observationsCol: number;
  mediaUrlCol: number;
}

function parseSheetRows(
  rows: any[][],
  sheetName: string,
  feature?: Feature | null
): GeneratedCharter[] {
  const charters: GeneratedCharter[] = [];

  let currentTitle = '';
  let currentCode = '';
  let currentMission = '';
  let currentPersona = feature?.user_types?.[0] ? String(feature.user_types[0]) : 'Customer';
  let currentStartingCondition = 'Application installed and launched';
  let currentExpectedOutcome = 'System performs requested actions reliably and gracefully';
  let currentScenarios: Array<{
    prompt_id: string;
    prompt_text: string;
    category: ScenarioCategory;
    status: ScenarioStatus;
    observations: string;
    media_url: string;
    sort_order: number;
  }> = [];

  let inScenarioTable = false;
  let colMap: ColumnMap | null = null;
  let charterIndexCounter = 1;

  const flushCurrentCharter = () => {
    if (currentScenarios.length > 0 || currentTitle.trim() || currentCode.trim()) {
      const finalTitle = currentTitle.trim() || (feature?.name ? `${feature.name} - ${sheetName}` : `${sheetName} Charter`);
      const finalCode = currentCode.trim() || `ET-${String(charterIndexCounter++).padStart(2, '0')}`;

      charters.push({
        charter_code: finalCode,
        title: finalTitle,
        mission: currentMission.trim() || 'Investigate functionality, responsiveness, and boundary behaviors.',
        user_persona: currentPersona.trim() || 'Customer',
        starting_condition: currentStartingCondition.trim() || 'Application ready on feature entry screen',
        expected_outcome: currentExpectedOutcome.trim() || 'System completes actions predictably without state corruption',
        scope: 'feature',
        status: 'Active',
        scenarios: currentScenarios.length > 0 ? currentScenarios : [
          {
            prompt_id: `${finalCode.replace(/^GH-/, '')}-P01`,
            prompt_text: `Explore primary workflow for ${finalTitle}.`,
            category: 'Golden Path',
            status: 'Untested',
            observations: '',
            media_url: '',
            sort_order: 0
          }
        ]
      });
    }

    // Reset state for next charter
    currentTitle = '';
    currentCode = '';
    currentMission = '';
    currentPersona = feature?.user_types?.[0] ? String(feature.user_types[0]) : 'Customer';
    currentStartingCondition = 'Application ready on feature entry screen';
    currentExpectedOutcome = 'System completes actions predictably without state corruption';
    currentScenarios = [];
    inScenarioTable = false;
    colMap = null;
  };

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) {
      // If we encounter an empty row while reading scenarios, close the scenario table
      if (inScenarioTable && currentScenarios.length > 0) {
        inScenarioTable = false;
      }
      continue;
    }

    const rowStrings = row.map(c => (c !== null && c !== undefined ? String(c).trim() : ''));
    const firstNonEmptyCell = rowStrings.find(c => c.length > 0) || '';
    const firstCell = rowStrings[0] || '';
    const secondCell = rowStrings[1] || '';

    // If whole row is empty, close scenario table if open
    if (!firstNonEmptyCell) {
      if (inScenarioTable && currentScenarios.length > 0) {
        inScenarioTable = false;
      }
      continue;
    }

    // 1. Detect New Charter Header: e.g. "Charter 02 — Restaurant & Food Discovery" or "Charter 1: ..."
    const charterHeaderMatch = firstNonEmptyCell.match(/^Charter\s*(\d+)?\s*[-—:]\s*(.+)/i);
    if (charterHeaderMatch) {
      if (currentScenarios.length > 0 || currentTitle) {
        flushCurrentCharter();
      }
      currentTitle = charterHeaderMatch[2].trim();
      const num = charterHeaderMatch[1];
      if (num && !currentCode) {
        currentCode = `ET-${num.padStart(2, '0')}`;
      }
      continue;
    }

    // 2. Detect ID: e.g. "ID: GH-FOOD-02" or Col 0 = "ID:", Col 1 = "GH-FOOD-02"
    if (/^ID:\s*/i.test(firstNonEmptyCell)) {
      currentCode = firstNonEmptyCell.replace(/^ID:\s*/i, '').trim();
      continue;
    }
    if (/^ID$/i.test(firstCell) && secondCell) {
      currentCode = secondCell.trim();
      continue;
    }

    // 3. Detect Mission: e.g. "Mission: Explore restaurant..." or Col 0 = "Mission:", Col 1 = "Explore..."
    if (/^Mission:\s*/i.test(firstNonEmptyCell)) {
      currentMission = firstNonEmptyCell.replace(/^Mission:\s*/i, '').trim();
      continue;
    }
    if (/^Mission$/i.test(firstCell) && secondCell) {
      currentMission = secondCell.trim();
      continue;
    }

    // 4. Detect User Persona: e.g. "User Persona: Customer browsing..."
    if (/^User\s*Persona:\s*/i.test(firstNonEmptyCell)) {
      currentPersona = firstNonEmptyCell.replace(/^User\s*Persona:\s*/i, '').trim();
      continue;
    }
    if (/^User\s*Persona$/i.test(firstCell) && secondCell) {
      currentPersona = secondCell.trim();
      continue;
    }

    // 5. Detect Starting Condition: e.g. "Starting Condition: Screenshot #2..."
    if (/^Starting\s*Condition:\s*/i.test(firstNonEmptyCell)) {
      currentStartingCondition = firstNonEmptyCell.replace(/^Starting\s*Condition:\s*/i, '').trim();
      continue;
    }
    if (/^Starting\s*Condition$/i.test(firstCell) && secondCell) {
      currentStartingCondition = secondCell.trim();
      continue;
    }

    // 6. Detect Expected Outcome: e.g. "Expected Outcome: Customers can discover..."
    if (/^Expected\s*Outcome:\s*/i.test(firstNonEmptyCell)) {
      currentExpectedOutcome = firstNonEmptyCell.replace(/^Expected\s*Outcome:\s*/i, '').trim();
      continue;
    }
    if (/^Expected\s*Outcome$/i.test(firstCell) && secondCell) {
      currentExpectedOutcome = secondCell.trim();
      continue;
    }

    // 7. Detect Boundary markers like "Follow-up:", "Traceability:", "Comments:", "Notes:"
    if (
      /^(Follow-up|Traceability|Comments?|Notes?|Media|Media\s*URL|Evidence|Screens?|Risks?|Assumptions?|Out\s*of\s*Scope|Defects?|Bugs?)\s*[:—\-]?/i.test(
        firstNonEmptyCell
      )
    ) {
      inScenarioTable = false;
      continue;
    }

    // 8. Detect Scenario Table Header Row: e.g. "Prompt ID" | "Exploration Prompts & Investigative Scenarios" | "Status"
    const promptIdIdx = rowStrings.findIndex(
      s => /Prompt\s*ID/i.test(s) || /^PromptID$/i.test(s) || /^Scenario\s*ID/i.test(s)
    );
    if (promptIdIdx !== -1) {
      const promptTextIdx = rowStrings.findIndex(
        (s, idx) =>
          idx !== promptIdIdx &&
          (/Prompt/i.test(s) || /Scenario/i.test(s) || /Investigative/i.test(s) || /Description/i.test(s))
      );
      const statusIdx = rowStrings.findIndex(s => /^Status$/i.test(s));
      const obsIdx = rowStrings.findIndex(s => /Observation/i.test(s) || /Note/i.test(s));
      const mediaIdx = rowStrings.findIndex(
        s => /Media/i.test(s) || /URL/i.test(s) || /Screenshot/i.test(s) || /Evidence/i.test(s)
      );

      colMap = {
        promptIdCol: promptIdIdx,
        promptTextCol: promptTextIdx !== -1 ? promptTextIdx : promptIdIdx + 1,
        statusCol: statusIdx !== -1 ? statusIdx : promptIdIdx + 2,
        observationsCol: obsIdx !== -1 ? obsIdx : promptIdIdx + 3,
        mediaUrlCol: mediaIdx !== -1 ? mediaIdx : promptIdIdx + 4
      };

      inScenarioTable = true;
      continue;
    }

    // 9. If inside Scenario Table, extract scenario row
    if (inScenarioTable && colMap) {
      const pId = rowStrings[colMap.promptIdCol] || '';
      const pText = rowStrings[colMap.promptTextCol] || '';
      const rawStatus = rowStrings[colMap.statusCol] || 'Untested';

      // If row starts with a header or boundary label, close table immediately
      if (
        /^(Charter|Mission|ID|Follow-up|Traceability|Comments?|Notes?|Media|Screens?|Risks?):/i.test(
          firstNonEmptyCell
        ) ||
        isNonScenarioText(firstNonEmptyCell)
      ) {
        inScenarioTable = false;
        r--; // Re-evaluate this row in the next cycle
        continue;
      }

      // Check if pText or pId is non-scenario text (URLs, comments, notes, section labels)
      if (isNonScenarioText(pText) && isNonScenarioText(pId)) {
        continue;
      }

      // Determine genuine prompt text
      let validPromptText = '';
      if (pText && !isNonScenarioText(pText)) {
        validPromptText = pText.trim();
      } else if (pId && !isNonScenarioText(pId) && pId.length > 5) {
        validPromptText = pId.trim();
      }

      // If no valid prompt text exists, discard this row (it's not a scenario!)
      if (!validPromptText) {
        continue;
      }

      // Determine clean prompt ID
      let validPromptId = pId.trim();
      if (!validPromptId || isNonScenarioText(validPromptId) || validPromptId.length > 25) {
        validPromptId = `P-${currentScenarios.length + 1}`;
      }

      // Normalize status
      let normalizedStatus: ScenarioStatus = 'Untested';
      const lowerStatus = rawStatus.toLowerCase();
      if (lowerStatus.includes('pass')) normalizedStatus = 'Pass';
      else if (lowerStatus.includes('fail')) normalizedStatus = 'Fail';
      else if (lowerStatus.includes('block')) normalizedStatus = 'Blocked';

      // Infer scenario category
      const category = inferScenarioCategory(validPromptText, validPromptId, currentScenarios.length);

      currentScenarios.push({
        prompt_id: validPromptId,
        prompt_text: validPromptText,
        category,
        status: normalizedStatus,
        observations: '',
        media_url: '',
        sort_order: currentScenarios.length
      });
    }
  }

  // Flush any remaining charter at the end of the sheet
  flushCurrentCharter();

  return charters;
}

/**
 * Heuristic to categorize exploration prompts based on content and ID pattern.
 */
function inferScenarioCategory(
  promptText: string,
  promptId: string,
  index: number
): ScenarioCategory {
  const lower = promptText.toLowerCase();

  // Failure & Recovery
  if (
    lower.includes('error') ||
    lower.includes('fail') ||
    lower.includes('timeout') ||
    lower.includes('crash') ||
    lower.includes('disconnect') ||
    lower.includes('airplane') ||
    lower.includes('offline') ||
    lower.includes('network') ||
    lower.includes('retry') ||
    lower.includes('reopen') ||
    lower.includes('double')
  ) {
    return 'Failure & Recovery';
  }

  // Boundary & Edge
  if (
    lower.includes('unusual') ||
    lower.includes('poorly formatted') ||
    lower.includes('partial') ||
    lower.includes('blank') ||
    lower.includes('empty') ||
    lower.includes('special') ||
    lower.includes('exceed') ||
    lower.includes('limit') ||
    lower.includes('boundary') ||
    lower.includes('edge') ||
    lower.includes('invalid') ||
    lower.includes('character')
  ) {
    return 'Boundary & Edge';
  }

  // Alternative Flow
  if (
    lower.includes('shortcut') ||
    lower.includes('alternative') ||
    lower.includes('cancel') ||
    lower.includes('skip') ||
    lower.includes('preset') ||
    lower.includes('dismiss') ||
    lower.includes('switch')
  ) {
    return 'Alternative Flow';
  }

  // Golden Path
  if (
    promptId.startsWith('01-') ||
    lower.includes('browse') ||
    lower.includes('valid') ||
    lower.includes('golden') ||
    lower.includes('standard') ||
    lower.includes('smoothly') ||
    lower.includes('primary') ||
    index === 0
  ) {
    return 'Golden Path';
  }

  return 'Boundary & Edge';
}
