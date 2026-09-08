import jsPDF from 'jspdf';
import { QACharter } from '@/lib/types';

export interface DefectItem {
  id: string;
  prompt_id: string;
  featureName: string;
  charterCode: string;
  charterTitle: string;
  charterMission: string;
  userPersona?: string;
  startingCondition?: string;
  expectedOutcome?: string;
  category: string;
  prompt_text: string;
  status: 'Fail' | 'Blocked' | 'Pass' | 'Untested';
  observations?: string;
  media_url?: string;
  traceability?: {
    derived_from?: {
      feature?: string[];
      risk?: string[];
      failure_state?: string[];
    };
    exploration_dimensions?: string[];
  };
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
}

export interface DefectReportMetadata {
  projectName: string;
  runName?: string;
  platform?: string;
  featureNames: string[];
  totalScenarios: number;
  passedCount: number;
  failedCount: number;
  blockedCount: number;
  untestedCount: number;
  passRate: number;
  environment?: string;
  testerName?: string;
  generatedDate?: string;
}

/**
 * Derives defect severity based on charter category and failure type.
 */
export function deriveSeverity(category?: string, status?: string): 'Critical' | 'High' | 'Medium' | 'Low' {
  if (status === 'Blocked') return 'High';
  if (category === 'Golden Path') return 'Critical';
  if (category === 'Alternative Flow') return 'High';
  if (category === 'Boundary & Edge') return 'Medium';
  return 'Low';
}

/**
 * Extracts defect items from charters
 */
export function extractDefects(
  charters: QACharter[],
  featMap: Map<string, string> = new Map()
): DefectItem[] {
  const defects: DefectItem[] = [];

  charters.forEach(c => {
    const featureName = (c.feature_id ? featMap.get(c.feature_id) : undefined) || 'Feature';
    (c.scenarios || []).forEach(s => {
      if (s.status === 'Fail' || s.status === 'Blocked') {
        defects.push({
          id: s.id,
          prompt_id: s.prompt_id,
          featureName,
          charterCode: c.charter_code,
          charterTitle: c.title,
          charterMission: c.mission,
          userPersona: c.user_persona,
          startingCondition: c.starting_condition,
          expectedOutcome: c.expected_outcome,
          category: s.category || 'Exploratory',
          prompt_text: s.prompt_text,
          status: s.status as 'Fail' | 'Blocked',
          observations: s.observations || 'No specific notes recorded by tester.',
          media_url: s.media_url,
          traceability: s.traceability,
          severity: deriveSeverity(s.category, s.status)
        });
      }
    });
  });

  return defects;
}

/**
 * Extracts defect items from a specific test run snapshot, using run.metadata.scenario_results if present.
 */
export function extractDefectsFromRunSnapshot(
  run: { metadata?: any },
  charters: QACharter[],
  featMap: Map<string, string> = new Map()
): DefectItem[] {
  const scenarioResults = run.metadata?.scenario_results || {};
  const hasSnapshot = Object.keys(scenarioResults).length > 0;

  if (!hasSnapshot) {
    return extractDefects(charters, featMap);
  }

  const defects: DefectItem[] = [];

  charters.forEach(c => {
    const featureName = (c.feature_id ? featMap.get(c.feature_id) : undefined) || 'Feature';
    (c.scenarios || []).forEach(s => {
      const snap = scenarioResults[s.id];
      const status = snap ? snap.status : s.status;
      const observations = snap?.observations !== undefined ? snap.observations : s.observations;
      const media_url = snap?.media_url !== undefined ? snap.media_url : s.media_url;

      if (status === 'Fail' || status === 'Blocked') {
        defects.push({
          id: s.id,
          prompt_id: s.prompt_id,
          featureName,
          charterCode: c.charter_code,
          charterTitle: c.title,
          charterMission: c.mission,
          userPersona: c.user_persona,
          startingCondition: c.starting_condition,
          expectedOutcome: c.expected_outcome,
          category: s.category || 'Exploratory',
          prompt_text: s.prompt_text,
          status: status as 'Fail' | 'Blocked',
          observations: observations || 'No specific notes recorded by tester.',
          media_url: media_url,
          traceability: s.traceability,
          severity: deriveSeverity(s.category, status)
        });
      }
    });
  });

  return defects;
}

/**
 * 1. Export Developer Defect Report as PDF (jsPDF)
 */
export function exportDefectReportPdf(
  metadata: DefectReportMetadata,
  defects: DefectItem[]
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  let y = 18;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin - 10) {
      doc.addPage();
      y = 18;
      // Header band on new page
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`QA Defect Report — ${metadata.projectName} (${metadata.featureNames.join(', ')})`, margin, 12);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, 14, pageWidth - margin, 14);
      return true;
    }
    return false;
  };

  // Header Banner
  doc.setFillColor(30, 41, 59); // Slate-800 (#1E293B)
  doc.roundedRect(margin, y, contentWidth, 24, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('QA TEST EXECUTION DEFECT REPORT', margin + 6, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  const subtitle = `${metadata.runName ? `Run: ${metadata.runName} | ` : ''}Project: ${metadata.projectName} | Scope: ${metadata.featureNames.join(', ') || 'All Features'} | Date: ${metadata.generatedDate || new Date().toLocaleDateString()}`;
  doc.text(subtitle, margin + 6, y + 17);

  y += 30;

  // Executive Metrics Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'FD');

  const colWidth = contentWidth / 4;
  const metricItems = [
    { label: 'TOTAL SCENARIOS', value: `${metadata.totalScenarios}` },
    { label: 'PASSED', value: `${metadata.passedCount} (${metadata.passRate}%)` },
    { label: 'FAILED DEFECTS', value: `${metadata.failedCount}` },
    { label: 'BLOCKED SCENARIOS', value: `${metadata.blockedCount}` }
  ];

  metricItems.forEach((m, idx) => {
    const colX = margin + (idx * colWidth);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(m.label, colX + 4, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    if (idx === 1) doc.setTextColor(16, 149, 102); // green
    else if (idx === 2) doc.setTextColor(225, 29, 72); // red
    else if (idx === 3) doc.setTextColor(217, 119, 6); // amber
    else doc.setTextColor(15, 23, 42);
    doc.text(m.value, colX + 4, y + 15);
  });

  y += 26;

  // Section: Quick Reference Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`1. Defect Summary Table (${defects.length} Issues Detected)`, margin, y);
  y += 5;

  if (defects.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(16, 149, 102);
    doc.text('✓ Excellent news! No test failures or blocker defects were recorded in this test execution run.', margin, y + 4);
    y += 12;
  } else {
    // Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('ID', margin + 2, y + 5);
    doc.text('SEVERITY', margin + 22, y + 5);
    doc.text('FEATURE / CHARTER', margin + 45, y + 5);
    doc.text('DEFECT SCENARIO SUMMARY', margin + 95, y + 5);
    doc.text('STATUS', margin + contentWidth - 16, y + 5);
    y += 7;

    // Table Rows
    defects.forEach((d) => {
      checkPageBreak(12);

      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y, margin + contentWidth, y);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(d.prompt_id, margin + 2, y + 5);

      // Severity tag
      if (d.severity === 'Critical') {
        doc.setTextColor(225, 29, 72);
      } else if (d.severity === 'High') {
        doc.setTextColor(234, 88, 12);
      } else {
        doc.setTextColor(71, 85, 105);
      }
      doc.text(d.severity, margin + 22, y + 5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      const featCharter = `${d.featureName} | ${d.charterCode}`;
      doc.text(featCharter.length > 25 ? featCharter.substring(0, 24) + '…' : featCharter, margin + 45, y + 5);

      const summary = d.prompt_text.length > 55 ? d.prompt_text.substring(0, 53) + '…' : d.prompt_text;
      doc.text(summary, margin + 95, y + 5);

      doc.setFont('helvetica', 'bold');
      if (d.status === 'Fail') doc.setTextColor(225, 29, 72);
      else doc.setTextColor(217, 119, 6);
      doc.text(d.status.toUpperCase(), margin + contentWidth - 16, y + 5);

      y += 7;
    });

    y += 8;
  }

  // Section 2: Detailed Bug Sheets for Developers
  if (defects.length > 0) {
    checkPageBreak(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('2. Actionable Developer Bug Sheets (Steps to Reproduce & Evidence)', margin, y);
    y += 7;

    defects.forEach((d, idx) => {
      // Estimate card height
      const promptLines = doc.splitTextToSize(d.prompt_text, contentWidth - 28);
      const obsLines = doc.splitTextToSize(d.observations || 'N/A', contentWidth - 28);
      const expLines = doc.splitTextToSize(d.expectedOutcome || 'N/A', contentWidth - 28);
      const cardHeight = 44 + (promptLines.length * 3.5) + (obsLines.length * 3.5) + (expLines.length * 3.5) + (d.media_url ? 8 : 0);

      checkPageBreak(Math.min(cardHeight, 60));

      // Bug Ticket Container
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, y, contentWidth, cardHeight, 2, 2, 'FD');

      // Left Accent Border (Red for Fail, Amber for Blocked)
      if (d.status === 'Fail') doc.setFillColor(225, 29, 72);
      else doc.setFillColor(217, 119, 6);
      doc.rect(margin, y, 2.5, cardHeight, 'F');

      let innerY = y + 6;

      // Defect Title Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      const title = `#${idx + 1} [${d.status.toUpperCase()}] ${d.prompt_id}: ${d.category} — ${d.featureName}`;
      doc.text(title, margin + 6, innerY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Severity: ${d.severity} | Charter: ${d.charterCode} (${d.charterTitle})`, margin + 6, innerY + 4.5);
      innerY += 9;

      // Steps to Reproduce
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      doc.text('STEPS TO REPRODUCE / INVESTIGATIVE MISSION:', margin + 6, innerY);
      innerY += 3.5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(promptLines, margin + 6, innerY);
      innerY += (promptLines.length * 3.5) + 2;

      // Observed Failure Behavior
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(225, 29, 72);
      doc.text('OBSERVED FAILURE BEHAVIOR (TESTER NOTES):', margin + 6, innerY);
      innerY += 3.5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(obsLines, margin + 6, innerY);
      innerY += (obsLines.length * 3.5) + 2;

      // Expected Behavior
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(16, 149, 102);
      doc.text('EXPECTED OUTCOME:', margin + 6, innerY);
      innerY += 3.5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(expLines, margin + 6, innerY);
      innerY += (expLines.length * 3.5) + 2;

      // Media / Screenshot Link
      if (d.media_url) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(37, 99, 235);
        doc.text('EVIDENCE ATTACHMENT: ', margin + 6, innerY);
        doc.setFont('helvetica', 'normal');
        doc.textWithLink(d.media_url.substring(0, 60) + (d.media_url.length > 60 ? '...' : ''), margin + 42, innerY, { url: d.media_url });
        innerY += 5;
      }

      y += cardHeight + 4;
    });
  }

  // Page Numbers Footer
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`AetherQA Studio Defect Report • Page ${i} of ${totalPages}`, margin, pageHeight - 8);
  }

  const cleanProjectName = metadata.projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`${cleanProjectName}_Defect_Report.pdf`);
}

/**
 * 2. Export Developer Defect Report as Markdown (.md)
 */
export function exportDefectReportMarkdown(
  metadata: DefectReportMetadata,
  defects: DefectItem[]
): string {
  const dateStr = metadata.generatedDate || new Date().toISOString().split('T')[0];
  let md = `# 🐞 QA Defect & Bug Resolution Report\n\n`;
  if (metadata.runName) md += `**Test Run:** ${metadata.runName}  \n`;
  md += `**Target Application:** ${metadata.projectName}  \n`;
  if (metadata.platform) md += `**Platform:** ${metadata.platform}  \n`;
  md += `**Features Tested:** ${metadata.featureNames.join(', ') || 'All Features'}  \n`;
  md += `**Date:** ${dateStr}  \n`;
  md += `**Execution Summary:** ${metadata.passedCount}/${metadata.totalScenarios} Passed (${metadata.passRate}%) | **${metadata.failedCount} Failed** | **${metadata.blockedCount} Blocked**  \n\n`;

  md += `---\n\n`;

  md += `## 1. Defect Summary Table\n\n`;
  md += `| Defect ID | Severity | Feature | Charter | Category | Status | Summary |\n`;
  md += `|-----------|----------|---------|---------|----------|--------|---------|\n`;

  if (defects.length === 0) {
    md += `| — | — | — | — | — | Pass | No defects found. All scenarios passed or untested. |\n\n`;
  } else {
    defects.forEach(d => {
      const cleanSummary = d.prompt_text.replace(/\|/g, '\\|');
      md += `| **${d.prompt_id}** | ${d.severity} | ${d.featureName} | ${d.charterCode} | ${d.category} | **${d.status}** | ${cleanSummary} |\n`;
    });
    md += `\n---\n\n`;
  }

  md += `## 2. Actionable Developer Bug Tickets\n\n`;

  if (defects.length === 0) {
    md += `> ✅ All test scenarios passed successfully. No open bugs to report.\n\n`;
  } else {
    defects.forEach((d, idx) => {
      md += `### ${idx + 1}. [${d.status.toUpperCase()}] \`${d.prompt_id}\`: ${d.category} — ${d.featureName}\n\n`;
      md += `- **Severity:** ${d.severity}\n`;
      md += `- **Charter:** \`${d.charterCode}\` (${d.charterTitle})\n`;
      md += `- **Mission:** ${d.charterMission}\n`;
      if (d.userPersona) md += `- **Target Persona:** ${d.userPersona}\n`;
      if (d.startingCondition) md += `- **Precondition:** ${d.startingCondition}\n`;
      md += `\n#### 🎯 Steps to Reproduce / Investigative Mission:\n`;
      md += `> ${d.prompt_text}\n\n`;

      md += `#### ❌ Observed Failure Behavior (QA Notes):\n`;
      md += `\`\`\`text\n${d.observations || 'No additional notes specified.'}\n\`\`\`\n\n`;

      md += `#### ✅ Expected Outcome:\n`;
      md += `${d.expectedOutcome || 'System should complete the journey smoothly without errors.'}\n\n`;

      if (d.media_url) {
        md += `#### 📸 Evidence / Screenshot:\n`;
        md += `[View Media / Evidence](${d.media_url})\n\n`;
      }

      if (d.traceability?.derived_from) {
        md += `#### 🔍 System Traceability & Risk Indicators:\n`;
        if (d.traceability.derived_from.failure_state) {
          md += `- **Failure State:** ${d.traceability.derived_from.failure_state.join('; ')}\n`;
        }
        if (d.traceability.derived_from.risk) {
          md += `- **Testing Risk:** ${d.traceability.derived_from.risk.join('; ')}\n`;
        }
        md += `\n`;
      }

      md += `---\n\n`;
    });
  }

  return md;
}

/**
 * 3. Export Developer Defect Report as CSV
 */
export function exportDefectReportCsv(
  metadata: DefectReportMetadata,
  defects: DefectItem[]
): string {
  const escapeCsv = (str: string = '') => `"${str.replace(/"/g, '""').replace(/\n/g, ' ')}"`;

  const headers = [
    'Defect_ID',
    'Severity',
    'Status',
    'Project',
    'Feature',
    'Charter_Code',
    'Charter_Title',
    'Category',
    'Investigative_Prompt',
    'Observed_Failure_Notes',
    'Expected_Outcome',
    'Evidence_URL',
    'Charter_Mission'
  ];

  const rows = defects.map(d => [
    escapeCsv(d.prompt_id),
    escapeCsv(d.severity),
    escapeCsv(d.status),
    escapeCsv(metadata.projectName),
    escapeCsv(d.featureName),
    escapeCsv(d.charterCode),
    escapeCsv(d.charterTitle),
    escapeCsv(d.category),
    escapeCsv(d.prompt_text),
    escapeCsv(d.observations || ''),
    escapeCsv(d.expectedOutcome || ''),
    escapeCsv(d.media_url || ''),
    escapeCsv(d.charterMission || '')
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Trigger file download helper
 */
export function triggerFileDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
