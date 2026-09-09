'use client';

import React, { useState, useEffect } from 'react';
import { 
  Feature, 
  Project, 
  QACharter, 
  CharterScenario, 
  ScenarioStatus,
  ContextPack,
  ValidationReport
} from '@/lib/types';
import { ContextPackModal } from './ContextPackModal';
import { MultiCharterRunnerModal } from './MultiCharterRunnerModal';
import { CharterWhyGeneratedModal } from './CharterWhyGeneratedModal';
import { CharterReviewModal } from './CharterReviewModal';
import { getStoredGeminiApiKey } from '@/lib/settings';
import { 
  BrainCircuit, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  HelpCircle, 
  Copy, 
  Check, 
  ExternalLink, 
  Trash2, 
  Edit3, 
  Save, 
  RefreshCw,
  FileSpreadsheet,
  Layers,
  ChevronDown,
  Sparkles,
  Zap,
  Shield,
  Info,
  ShieldCheck,
  Box,
  Play,
  Download,
  FileDown,
  FileText,
  RotateCcw
} from 'lucide-react';
import { 
  exportDefectReportPdf, 
  exportDefectReportMarkdown, 
  exportDefectReportCsv, 
  triggerFileDownload, 
  extractDefects, 
  DefectReportMetadata 
} from '@/lib/defectReportExport';

interface ExploratoryChartersViewProps {
  currentFeature: Feature | null;
  currentProject: Project | null;
  allProjects?: Project[];
  allFeatures?: Feature[];
  charters: QACharter[];
  onRefreshCharters: () => Promise<void>;
  onOpenRunner?: () => void;
}

export function ExploratoryChartersView({
  currentFeature,
  currentProject,
  allProjects,
  allFeatures,
  charters,
  onRefreshCharters,
  onOpenRunner
}: ExploratoryChartersViewProps) {
  const [selectedCharterId, setSelectedCharterId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [copied, setCopied] = useState(false);
  const [savingScenarioId, setSavingScenarioId] = useState<string | null>(null);
  const [engineUsed, setEngineUsed] = useState<'gemini' | 'deterministic' | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isContextPackModalOpen, setIsContextPackModalOpen] = useState(false);
  const [contextPack, setContextPack] = useState<ContextPack | null>(null);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [isLocalRunnerOpen, setIsLocalRunnerOpen] = useState(false);
  const [showDefectMenu, setShowDefectMenu] = useState(false);
  const [isWhyGeneratedOpen, setIsWhyGeneratedOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [activeWhyCharter, setActiveWhyCharter] = useState<QACharter | null>(null);
  const [activeReviewCharter, setActiveReviewCharter] = useState<QACharter | null>(null);
  const [isGeneratingFollowUp, setIsGeneratingFollowUp] = useState<string | null>(null);

  // Local state for instant editing responsiveness
  const [localCharters, setLocalCharters] = useState<QACharter[]>(charters);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const key = getStoredGeminiApiKey();
      setHasApiKey(!!key);
      if (currentFeature) {
        const cachedEngine = localStorage.getItem(`charters_engine_${currentFeature.id}`) as 'gemini' | 'deterministic' | null;
        setEngineUsed(cachedEngine);
        try {
          const cachedCP = localStorage.getItem(`charters_context_pack_${currentFeature.id}`);
          if (cachedCP) setContextPack(JSON.parse(cachedCP));
          const cachedVR = localStorage.getItem(`charters_validation_report_${currentFeature.id}`);
          if (cachedVR) setValidationReport(JSON.parse(cachedVR));
        } catch {}
      }
    }
  }, [currentFeature]);

  useEffect(() => {
    setLocalCharters(charters);
    if (charters.length > 0) {
      if (!selectedCharterId || !charters.find(c => c.id === selectedCharterId)) {
        setSelectedCharterId(charters[0].id);
      }
    } else {
      setSelectedCharterId('');
    }
  }, [charters, selectedCharterId]);

  const activeCharter = localCharters.find(c => c.id === selectedCharterId) || localCharters[0];
  const activeContextPack = activeCharter?.context_pack || contextPack;
  const activeValidationReport = activeCharter?.validation_report || validationReport;

  // AI Generation Handler
  const handleGenerateCharters = async () => {
    if (!currentFeature) return;
    setIsGenerating(true);
    try {
      const apiKey = getStoredGeminiApiKey();

      const res = await fetch('/api/charters/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature_id: currentFeature.id,
          project_id: currentFeature.project_id,
          api_key: apiKey
        })
      });

      if (!res.ok) {
        throw new Error('Failed to generate charters');
      }

      const resData = await res.json();
      if (resData.engine) {
        setEngineUsed(resData.engine);
        if (typeof window !== 'undefined') {
          localStorage.setItem(`charters_engine_${currentFeature.id}`, resData.engine);
        }
      }
      if (resData.context_pack) {
        setContextPack(resData.context_pack);
        if (typeof window !== 'undefined') {
          localStorage.setItem(`charters_context_pack_${currentFeature.id}`, JSON.stringify(resData.context_pack));
        }
      }
      if (resData.validation_report) {
        setValidationReport(resData.validation_report);
        if (typeof window !== 'undefined') {
          localStorage.setItem(`charters_validation_report_${currentFeature.id}`, JSON.stringify(resData.validation_report));
        }
      }

      await onRefreshCharters();
    } catch (err) {
      console.error('Error generating exploratory charters:', err);
      alert('Error generating charters. Please check console or try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Scenario update handler (Status, Observations, Media URL)
  const handleUpdateScenario = async (
    scenarioId: string,
    updates: Partial<CharterScenario>
  ) => {
    setSavingScenarioId(scenarioId);

    // Optimistic UI update
    setLocalCharters(prev => prev.map(c => {
      if (!c.scenarios) return c;
      return {
        ...c,
        scenarios: c.scenarios.map(s => s.id === scenarioId ? { ...s, ...updates } : s)
      };
    }));

    try {
      const res = await fetch('/api/charters', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'scenario',
          scenario_id: scenarioId,
          ...updates
        })
      });

      if (!res.ok) {
        console.error('Failed to update scenario');
      }
    } catch (err) {
      console.error('Error saving scenario:', err);
    } finally {
      setTimeout(() => setSavingScenarioId(null), 400);
    }
  };

  // Add new scenario row
  const handleAddScenario = async () => {
    if (!activeCharter) return;
    try {
      const nextNum = (activeCharter.scenarios?.length || 0) + 1;
      const charterPrefix = activeCharter.charter_code.split('-')[1] || '01';
      const promptId = `${charterPrefix}-P0${nextNum}`;

      const res = await fetch('/api/charters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_scenario',
          charter_id: activeCharter.id,
          prompt_id: promptId,
          prompt_text: 'Enter exploratory test scenario or prompt to observe...',
          sort_order: nextNum
        })
      });

      if (res.ok) {
        await onRefreshCharters();
      }
    } catch (err) {
      console.error('Error creating scenario:', err);
    }
  };

  // Delete scenario row
  const handleDeleteScenario = async (scenarioId: string) => {
    if (!confirm('Are you sure you want to remove this scenario?')) return;
    try {
      const res = await fetch(`/api/charters?scenario_id=${scenarioId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await onRefreshCharters();
      }
    } catch (err) {
      console.error('Error deleting scenario:', err);
    }
  };

  // Generate Follow-up Charter for Failed or Blocked scenario
  const handleGenerateFollowUp = async (scenario: CharterScenario) => {
    if (!currentFeature) return;
    setIsGeneratingFollowUp(scenario.id);
    try {
      const res = await fetch('/api/charters/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature_id: currentFeature.id,
          charter_id: scenario.charter_id,
          prompt_id: scenario.prompt_id,
          observation: scenario.observations || 'Scenario failed or blocked during exploratory testing'
        })
      });

      if (!res.ok) throw new Error('Failed to generate follow-up charter');

      await onRefreshCharters();
      alert(`Follow-up exploratory charter generated for prompt ${scenario.prompt_id}!`);
    } catch (err) {
      console.error('Error generating follow-up charter:', err);
      alert('Error generating follow-up charter.');
    } finally {
      setIsGeneratingFollowUp(null);
    }
  };

  // Copy Formatted Table to Clipboard for Google Sheets / Docs / Excel
  const handleCopyFormattedTable = () => {
    if (!activeCharter) return;

    let text = `${activeCharter.charter_code} | ${activeCharter.title}\n`;
    text += `Mission: ${activeCharter.mission}\n`;
    text += `User Persona: ${activeCharter.user_persona}\n`;
    text += `Starting Condition: ${activeCharter.starting_condition}\n`;
    text += `Expected Outcome: ${activeCharter.expected_outcome}\n\n`;
    text += `Prompt ID\tCoverage Category\tExploration Prompts & Investigative Scenarios\tStatus\tObservations & Notes\tMedia URL\n`;

    activeCharter.scenarios?.forEach(s => {
      text += `${s.prompt_id}\t${s.category || 'Exploratory'}\t${s.prompt_text}\t${s.status}\t${s.observations || ''}\t${s.media_url || ''}\n`;
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filtered scenarios
  const filteredScenarios = (activeCharter?.scenarios || []).filter(s => {
    if (filterStatus === 'All') return true;
    return s.status === filterStatus;
  });

  // Calculate overall stats
  const totalScenarios = localCharters.reduce((acc, c) => acc + (c.scenarios?.length || 0), 0);
  const passedScenarios = localCharters.reduce((acc, c) => acc + (c.scenarios?.filter(s => s.status === 'Pass').length || 0), 0);
  const failedScenarios = localCharters.reduce((acc, c) => acc + (c.scenarios?.filter(s => s.status === 'Fail').length || 0), 0);
  const blockedScenarios = localCharters.reduce((acc, c) => acc + (c.scenarios?.filter(s => s.status === 'Blocked').length || 0), 0);
  const untestedScenarios = totalScenarios - (passedScenarios + failedScenarios + blockedScenarios);

  // Defect Report Metadata Builder
  const getDefectReportMetadata = (): DefectReportMetadata => {
    return {
      projectName: currentProject?.name || 'QA App',
      platform: currentProject?.platform || 'General',
      featureNames: currentFeature ? [currentFeature.name] : ['All Features'],
      totalScenarios,
      passedCount: passedScenarios,
      failedCount: failedScenarios,
      blockedCount: blockedScenarios,
      untestedCount: untestedScenarios,
      passRate: totalScenarios > 0 ? Math.round((passedScenarios / totalScenarios) * 100) : 0,
      generatedDate: new Date().toLocaleDateString()
    };
  };

  const handleDownloadDefectPdf = () => {
    const meta = getDefectReportMetadata();
    const featMap = new Map((allFeatures || []).map(f => [f.id, f.name]));
    if (currentFeature) featMap.set(currentFeature.id, currentFeature.name);
    const defects = extractDefects(localCharters, featMap);
    exportDefectReportPdf(meta, defects);
    setShowDefectMenu(false);
  };

  const handleDownloadDefectMarkdown = () => {
    const meta = getDefectReportMetadata();
    const featMap = new Map((allFeatures || []).map(f => [f.id, f.name]));
    if (currentFeature) featMap.set(currentFeature.id, currentFeature.name);
    const defects = extractDefects(localCharters, featMap);
    const md = exportDefectReportMarkdown(meta, defects);
    const filename = `${meta.projectName.replace(/\s+/g, '_')}_Defects.md`;
    triggerFileDownload(md, filename, 'text/markdown;charset=utf-8;');
    setShowDefectMenu(false);
  };

  const handleDownloadDefectCsv = () => {
    const meta = getDefectReportMetadata();
    const featMap = new Map((allFeatures || []).map(f => [f.id, f.name]));
    if (currentFeature) featMap.set(currentFeature.id, currentFeature.name);
    const defects = extractDefects(localCharters, featMap);
    const csv = exportDefectReportCsv(meta, defects);
    const filename = `${meta.projectName.replace(/\s+/g, '_')}_Defects.csv`;
    triggerFileDownload(csv, filename, 'text/csv;charset=utf-8;');
    setShowDefectMenu(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-clinical-warm overflow-hidden">
      {/* Top Header Bar */}
      <div className="px-3.5 sm:px-6 py-3.5 bg-white border-b border-clinical-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-dark-chassis text-neon flex items-center justify-center font-mono text-xs font-bold shrink-0 shadow-xs">
            ET
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h2 className="text-sm font-bold text-dark-chassis tracking-tight">
                Exploratory Testing Charters
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-dark-tertiary/10 text-dark-secondary font-mono">
                {localCharters.length} {localCharters.length === 1 ? 'Charter' : 'Charters'} ({totalScenarios} Scenarios)
              </span>
              {engineUsed === 'gemini' ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 border border-amber-500/30 flex items-center gap-1 shadow-2xs" title="Generated using Google Gemini Flash Multimodal Vision">
                  <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                  Gemini Flash AI
                </span>
              ) : engineUsed === 'deterministic' ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-dark-tertiary/10 text-dark-secondary border border-dark-tertiary/20 flex items-center gap-1" title="Generated using Offline Domain Engine">
                  <Shield className="w-3 h-3 text-dark-secondary" />
                  Offline Domain Engine
                </span>
              ) : null}

              {activeValidationReport && (
                <button
                  onClick={() => setIsContextPackModalOpen(true)}
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center gap-1 shadow-2xs hover:bg-emerald-100 transition"
                  title="Quality Gate Verified: Click to view evidence audit report"
                >
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Quality Gate: {activeValidationReport.score}%
                </button>
              )}
            </div>
            <p className="text-xs text-txt-muted">
              Investigative test missions, prompts, empirical observations, and evidence tracking.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {activeContextPack && (
            <button
              onClick={() => setIsContextPackModalOpen(true)}
              className="min-h-[38px] px-3 py-1.5 rounded-pill bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-medium flex items-center gap-1.5 transition"
              title="Inspect Controlled Evidence Context Pack, 8 Blueprint Dimensions & Visual Observations"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Evidence Pipeline</span>
            </button>
          )}
          {hasApiKey ? (
            <span className="text-[10px] text-emerald-600 font-mono hidden md:flex items-center gap-1 px-2.5 py-1 bg-emerald-50 rounded-full border border-emerald-200" title="Gemini API Key detected from Settings">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Gemini Key Connected
            </span>
          ) : (
            <span className="text-[10px] text-txt-muted font-mono hidden md:flex items-center gap-1 px-2.5 py-1 bg-qa-warm rounded-full border border-qa-border" title="No Gemini API Key found in Settings. Click Settings icon to add key for live multimodal vision.">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
              Offline Engine Active
            </span>
          )}

          {/* Defect Report Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDefectMenu(!showDefectMenu)}
              className="min-h-[38px] px-3 py-1.5 rounded-pill bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-2xs"
              title="Download defect report for developers"
            >
              <FileDown className="w-3.5 h-3.5 text-rose-600" />
              <span>Defect Report</span>
              {(failedScenarios > 0 || blockedScenarios > 0) && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-rose-600 text-white">
                  {failedScenarios + blockedScenarios}
                </span>
              )}
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {showDefectMenu && (
              <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl border border-clinical-border shadow-xl p-2 z-50 animate-in fade-in-50 zoom-in-95 text-xs text-dark-chassis">
                <div className="px-3 py-1.5 border-b border-clinical-border mb-1">
                  <span className="font-bold block">Developer Defect Report</span>
                  <span className="text-[10px] text-txt-muted">
                    {failedScenarios} Failed, {blockedScenarios} Blocked
                  </span>
                </div>

                <button
                  onClick={handleDownloadDefectPdf}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 flex items-center gap-2 transition"
                >
                  <FileDown className="w-4 h-4 text-rose-600" />
                  <div>
                    <span className="font-semibold block">Download PDF</span>
                    <span className="text-[10px] text-txt-muted">Executive metrics &amp; bug tickets</span>
                  </div>
                </button>

                <button
                  onClick={handleDownloadDefectMarkdown}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 flex items-center gap-2 transition"
                >
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <div>
                    <span className="font-semibold block">Download Markdown (.md)</span>
                    <span className="text-[10px] text-txt-muted">Ready for Jira, Linear, GitHub</span>
                  </div>
                </button>

                <button
                  onClick={handleDownloadDefectCsv}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 flex items-center gap-2 transition"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="font-semibold block">Download CSV (.csv)</span>
                    <span className="text-[10px] text-txt-muted">Tabular defect data</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleCopyFormattedTable}
            disabled={!activeCharter}
            className="min-h-[38px] px-3 py-1.5 rounded-pill bg-dark-tertiary/10 hover:bg-dark-tertiary/20 text-dark-chassis text-xs font-medium hidden sm:flex items-center gap-1.5 transition disabled:opacity-40"
            title="Copy Charter formatted for Google Sheets, Notion, or Excel"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-semibold">Copied Table!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-txt-muted" />
                <span>Copy as Table</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              if (onOpenRunner) {
                onOpenRunner();
              } else {
                setIsLocalRunnerOpen(true);
              }
            }}
            className="min-h-[38px] px-3.5 py-1.5 rounded-pill bg-dark-chassis hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm active:scale-95 border border-dark-secondary"
            title="Run all charters across this app or select multiple features"
          >
            <Play className="w-3.5 h-3.5 text-neon fill-neon" />
            <span>Run Suite</span>
          </button>

          <button
            onClick={handleGenerateCharters}
            disabled={isGenerating || !currentFeature}
            className="min-h-[38px] px-3.5 py-1.5 rounded-pill bg-neon hover:bg-neon-bright text-dark-chassis text-xs font-semibold flex items-center gap-1.5 transition shadow-sm active:scale-95 disabled:opacity-50"
          >
            <BrainCircuit className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isGenerating ? 'Synthesizing Charters...' : 'Generate Charters with AI'}</span>
            <span className="sm:hidden">{isGenerating ? 'Generating...' : 'Generate AI'}</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Surface */}
      {localCharters.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white/50 m-4 rounded-[20px] border border-dashed border-clinical-border">
          <div className="w-16 h-16 rounded-2xl bg-dark-chassis/5 flex items-center justify-center text-dark-chassis mb-4">
            <BrainCircuit className="w-8 h-8 text-dark-chassis" />
          </div>
          <h3 className="text-base font-bold text-dark-chassis mb-1">
            No Exploratory Testing Charters Generated Yet
          </h3>
          <p className="text-xs text-txt-muted max-w-md mb-6 leading-relaxed">
            The AI engine will analyze your uploaded screenshots, visual journey paths, confirmed business rules, and unknown gaps to generate structured test charters ready for device exploration.
          </p>
          <button
            onClick={handleGenerateCharters}
            disabled={isGenerating || !currentFeature}
            className="px-5 py-2.5 rounded-pill bg-neon hover:bg-neon-bright text-dark-chassis text-xs font-bold flex items-center gap-2 transition shadow-md active:scale-95"
          >
            <BrainCircuit className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Synthesizing Intelligence...' : 'Generate Test Charters Now'}
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Secondary Sub-Bar: Charter Tabs & Filter Badges */}
          <div className="px-3.5 sm:px-6 py-2 bg-clinical-warm/80 border-b border-clinical-border flex items-center justify-between gap-3 shrink-0 overflow-x-auto no-scrollbar touch-pan-x">
            {/* Charter Tabs */}
            <div className="flex items-center gap-1.5">
              {localCharters.map((charter) => {
                const isSelected = charter.id === activeCharter?.id;
                const passCount = charter.scenarios?.filter(s => s.status === 'Pass').length || 0;
                const totalCount = charter.scenarios?.length || 0;
                return (
                  <button
                    key={charter.id}
                    onClick={() => setSelectedCharterId(charter.id)}
                    className={`px-3 py-1.5 rounded-pill text-xs font-medium flex items-center gap-2 whitespace-nowrap transition ${
                      isSelected
                        ? 'bg-dark-chassis text-white shadow-xs font-semibold'
                        : 'bg-white hover:bg-clinical-border text-dark-secondary border border-clinical-border'
                    }`}
                  >
                    <span className="font-mono">{charter.charter_code}</span>
                    <span className="truncate max-w-[140px] text-[11px] opacity-85">{charter.title.split('|')[0].trim()}</span>
                    {totalCount > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isSelected ? 'bg-neon text-dark-chassis font-bold' : 'bg-dark-secondary/10 text-txt-muted'
                      }`}>
                        {passCount}/{totalCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Status Filter Badges */}
            <div className="flex items-center gap-1 shrink-0 text-xs">
              <span className="text-[11px] text-txt-muted font-medium mr-1 hidden xs:inline">Filter:</span>
              {(['All', 'Pass', 'Fail', 'Blocked', 'Untested'] as const).map(status => {
                const isActive = filterStatus === status;
                return (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition ${
                      isActive
                        ? 'bg-dark-chassis text-white font-semibold'
                        : 'bg-white text-txt-muted hover:text-dark-chassis border border-clinical-border/60'
                    }`}
                  >
                    {status}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Charter Workspace Scroll Area */}
          <div className="flex-1 p-3.5 sm:p-5 md:p-6 overflow-y-auto space-y-4">
            {activeCharter && (
              <div className="bg-white rounded-[20px] border border-clinical-border shadow-xs overflow-hidden">
                {/* Charter Context Header (Exact format requested) */}
                <div className="p-4 sm:p-5 border-b border-clinical-border bg-gradient-to-r from-slate-50/80 to-white">
                  <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-4 mb-3">
                    <h1 className="text-base sm:text-lg font-extrabold text-dark-chassis tracking-tight font-sans">
                      {activeCharter.charter_code} <span className="text-txt-muted font-normal">|</span> {activeCharter.title.replace(/^[A-Z0-9-]+\s*\|\s*/, '')}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Quality Score Badge */}
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                        {activeValidationReport?.score ?? 94}/100 Strong
                      </span>

                      {/* Why Was This Generated Button */}
                      <button
                        onClick={() => {
                          setActiveWhyCharter(activeCharter);
                          setIsWhyGeneratedOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-pill text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center gap-1 transition shadow-2xs"
                        title="Inspect AI Lineage, 9-check quality gate and evidence sources"
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="hidden sm:inline">Why generated?</span>
                      </button>

                      {/* Human Review Action Button */}
                      <button
                        onClick={() => {
                          setActiveReviewCharter(activeCharter);
                          setIsReviewOpen(true);
                        }}
                        className={`px-2.5 py-1 rounded-pill text-[11px] font-semibold flex items-center gap-1 transition border shadow-2xs ${
                          activeCharter.status === 'Approved'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : activeCharter.status === 'Rejected'
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                        }`}
                        title="Approve or Reject this charter with structured QA feedback"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-current" />
                        <span>{activeCharter.status || 'Draft'}</span>
                      </button>
                    </div>
                  </div>

                  {/* 4 Core Mission Pillars */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-2">
                      <span className="font-bold text-dark-chassis shrink-0 sm:w-32">Mission:</span>
                      <span className="text-dark-secondary leading-relaxed">{activeCharter.mission}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-2">
                      <span className="font-bold text-dark-chassis shrink-0 sm:w-32">User Persona:</span>
                      <span className="text-dark-secondary leading-relaxed">{activeCharter.user_persona}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-2">
                      <span className="font-bold text-dark-chassis shrink-0 sm:w-32">Starting Condition:</span>
                      <span className="text-dark-secondary leading-relaxed">{activeCharter.starting_condition}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-2">
                      <span className="font-bold text-dark-chassis shrink-0 sm:w-32">Expected Outcome:</span>
                      <span className="text-dark-secondary leading-relaxed">{activeCharter.expected_outcome}</span>
                    </div>
                  </div>

                  {/* 360° Coverage Model Breakdown */}
                  {activeCharter.scenarios && activeCharter.scenarios.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-200/70 flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-txt-muted font-bold text-[10px] uppercase tracking-wider">360° Coverage:</span>
                      {(() => {
                        const goldenCount = activeCharter.scenarios.filter(s => s.category === 'Golden Path').length;
                        const altCount = activeCharter.scenarios.filter(s => s.category === 'Alternative Flow').length;
                        const boundCount = activeCharter.scenarios.filter(s => s.category === 'Boundary & Edge').length;
                        const failCount = activeCharter.scenarios.filter(s => s.category === 'Failure & Recovery').length;

                        return (
                          <>
                            {goldenCount > 0 && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                {goldenCount} Golden Path
                              </span>
                            )}
                            {altCount > 0 && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-300">
                                <span className="w-2 h-2 rounded-full bg-sky-500" />
                                {altCount} Alternative Flow
                              </span>
                            )}
                            {boundCount > 0 && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-300">
                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                {boundCount} Boundary &amp; Edge
                              </span>
                            )}
                            {failCount > 0 && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-300">
                                <span className="w-2 h-2 rounded-full bg-rose-500" />
                                {failCount} Failure &amp; Recovery
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Desktop Scenarios Table (hidden on mobile/tablet < lg) */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#1E293B] text-white text-[11px] font-bold tracking-wider uppercase border-b border-slate-700">
                        <th className="py-3 px-4 w-24 shrink-0 font-mono">Prompt ID</th>
                        <th className="py-3 px-4 min-w-[280px]">Exploration Prompts &amp; Investigative Scenarios</th>
                        <th className="py-3 px-4 w-32">Status</th>
                        <th className="py-3 px-4 min-w-[260px]">Observations &amp; Notes</th>
                        <th className="py-3 px-4 w-36">Media URL</th>
                        <th className="py-3 px-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-clinical-border text-xs">
                      {filteredScenarios.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-txt-muted italic">
                            No scenarios matching filter "{filterStatus}".
                          </td>
                        </tr>
                      ) : (
                        filteredScenarios.map((scenario) => {
                          const statusColors = {
                            Pass: 'bg-emerald-50 text-emerald-700 border-emerald-300',
                            Fail: 'bg-rose-50 text-rose-700 border-rose-300',
                            Blocked: 'bg-amber-50 text-amber-700 border-amber-300',
                            Untested: 'bg-slate-50 text-slate-600 border-slate-300'
                          };

                          return (
                            <tr key={scenario.id} className="hover:bg-slate-50/60 transition-colors group">
                              {/* Prompt ID */}
                              <td className="py-3.5 px-4 font-mono font-bold text-dark-chassis align-top">
                                {scenario.prompt_id}
                              </td>

                              {/* Exploration Prompts & Scenarios with Traceability */}
                              <td className="py-3.5 px-4 text-dark-secondary align-top leading-relaxed">
                                {scenario.category && (
                                  <div className="mb-2">
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border ${
                                      scenario.category === 'Golden Path'
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                        : scenario.category === 'Alternative Flow'
                                        ? 'bg-sky-50 text-sky-800 border-sky-300'
                                        : scenario.category === 'Boundary & Edge'
                                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                                        : 'bg-rose-50 text-rose-800 border-rose-300'
                                    }`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${
                                        scenario.category === 'Golden Path'
                                          ? 'bg-emerald-500 animate-pulse'
                                          : scenario.category === 'Alternative Flow'
                                          ? 'bg-sky-500'
                                          : scenario.category === 'Boundary & Edge'
                                          ? 'bg-amber-500'
                                          : 'bg-rose-500'
                                      }`} />
                                      {scenario.category}
                                    </span>
                                  </div>
                                )}
                                <div className="text-dark-chassis font-medium">{scenario.prompt_text}</div>
                                {scenario.traceability && (
                                  <div className="mt-2 space-y-1.5 pt-1.5 border-t border-slate-100">
                                    <div className="flex flex-wrap items-center gap-1">
                                      {scenario.traceability.exploration_dimensions?.map((dim, dIdx) => (
                                        <span key={dIdx} className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                          {dim}
                                        </span>
                                      ))}
                                    </div>
                                    {scenario.traceability.derived_from && (
                                      <details className="text-[10px] text-txt-muted group/trace">
                                        <summary className="cursor-pointer hover:text-dark-chassis font-medium inline-flex items-center gap-1 text-[10px]">
                                          <Info className="w-3 h-3 text-indigo-500" /> Traceability Reason
                                        </summary>
                                        <div className="mt-1 p-2 rounded-lg bg-slate-50 border border-slate-200 space-y-0.5 text-[10px] text-slate-700">
                                          {scenario.traceability.derived_from.failure_state && (
                                            <div><strong className="text-rose-700">Failure State:</strong> {scenario.traceability.derived_from.failure_state.join('; ')}</div>
                                          )}
                                          {scenario.traceability.derived_from.risk && (
                                            <div><strong className="text-amber-700">Testing Risk:</strong> {scenario.traceability.derived_from.risk.join('; ')}</div>
                                          )}
                                          {scenario.traceability.derived_from.feature && (
                                            <div><strong className="text-blue-700">Feature Scope:</strong> {scenario.traceability.derived_from.feature.join('; ')}</div>
                                          )}
                                        </div>
                                      </details>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* Status Dropdown / Badge */}
                              <td className="py-3.5 px-4 align-top">
                                <div className="relative inline-block">
                                  <select
                                    value={scenario.status}
                                    onChange={(e) => handleUpdateScenario(scenario.id, { status: e.target.value as ScenarioStatus })}
                                    className={`text-xs font-semibold px-2.5 py-1 rounded-pill border appearance-none pr-6 cursor-pointer focus:outline-none focus:ring-1 focus:ring-dark-chassis transition ${
                                      statusColors[scenario.status] || statusColors.Untested
                                    }`}
                                  >
                                    <option value="Untested">Untested</option>
                                    <option value="Pass">Pass</option>
                                    <option value="Fail">Fail</option>
                                    <option value="Blocked">Blocked</option>
                                  </select>
                                  <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                                </div>
                                {(scenario.status === 'Fail' || scenario.status === 'Blocked') && (
                                  <button
                                    onClick={() => handleGenerateFollowUp(scenario)}
                                    disabled={isGeneratingFollowUp === scenario.id}
                                    className="mt-2 w-full px-2 py-1 rounded-pill bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold flex items-center justify-center gap-1 transition shadow-2xs active:scale-95 disabled:opacity-50"
                                    title="Generate targeted follow-up exploratory charter for this failure"
                                  >
                                    <Sparkles className={`w-3 h-3 text-rose-600 ${isGeneratingFollowUp === scenario.id ? 'animate-spin' : ''}`} />
                                    <span>{isGeneratingFollowUp === scenario.id ? 'Generating...' : 'Follow-Up'}</span>
                                  </button>
                                )}
                              </td>

                              {/* Observations & Notes (Live editable field) */}
                              <td className="py-3 px-4 align-top">
                                <textarea
                                  defaultValue={scenario.observations || ''}
                                  placeholder="Record empirical tester observations, replies received, or unexpected bugs..."
                                  onBlur={(e) => {
                                    if (e.target.value !== scenario.observations) {
                                      handleUpdateScenario(scenario.id, { observations: e.target.value });
                                    }
                                  }}
                                  rows={3}
                                  className="w-full text-xs p-2 rounded-lg border border-clinical-border bg-white text-dark-chassis placeholder:text-txt-muted/70 focus:outline-none focus:border-dark-chassis transition resize-y leading-relaxed font-sans"
                                />
                                {savingScenarioId === scenario.id && (
                                  <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
                                    <Check className="w-3 h-3" /> Autosaved
                                  </span>
                                )}
                              </td>

                              {/* Media URL */}
                              <td className="py-3 px-4 align-top">
                                <div className="space-y-1">
                                  <input
                                    type="text"
                                    defaultValue={scenario.media_url || ''}
                                    placeholder="https://..."
                                    onBlur={(e) => {
                                      if (e.target.value !== scenario.media_url) {
                                        handleUpdateScenario(scenario.id, { media_url: e.target.value });
                                      }
                                    }}
                                    className="w-full text-[11px] p-1.5 rounded border border-clinical-border bg-white text-dark-secondary placeholder:text-txt-muted/60 focus:outline-none focus:border-dark-chassis font-mono"
                                  />
                                  {scenario.media_url && (
                                    <a
                                      href={scenario.media_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[10px] text-neon-dark hover:underline font-mono"
                                    >
                                      <ExternalLink className="w-2.5 h-2.5" /> Open Media
                                    </a>
                                  )}
                                </div>
                              </td>

                              {/* Row delete */}
                              <td className="py-3.5 px-2 align-top text-center">
                                <button
                                  onClick={() => handleDeleteScenario(scenario.id)}
                                  className="text-txt-muted hover:text-rose-600 opacity-0 group-hover:opacity-100 transition p-1"
                                  title="Delete scenario row"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Scenarios Card View (< lg screens) */}
                <div className="block lg:hidden divide-y divide-clinical-border">
                  {filteredScenarios.length === 0 ? (
                    <div className="py-8 text-center text-txt-muted italic text-xs">
                      No scenarios matching filter "{filterStatus}".
                    </div>
                  ) : (
                    filteredScenarios.map((scenario) => {
                      return (
                        <div key={scenario.id} className="p-3.5 sm:p-4 bg-white hover:bg-slate-50/50 space-y-3">
                          {/* Top Row: Prompt ID, Category, and Delete */}
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-dark-chassis px-2.5 py-0.5 rounded-pill bg-slate-100 border border-slate-200">
                                {scenario.prompt_id}
                              </span>
                              {scenario.category && (
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-pill text-[10px] font-bold border ${
                                  scenario.category === 'Golden Path'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : scenario.category === 'Alternative Flow'
                                    ? 'bg-sky-50 text-sky-800 border-sky-300'
                                    : scenario.category === 'Boundary & Edge'
                                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                                    : 'bg-rose-50 text-rose-800 border-rose-300'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    scenario.category === 'Golden Path'
                                      ? 'bg-emerald-500 animate-pulse'
                                      : scenario.category === 'Alternative Flow'
                                      ? 'bg-sky-500'
                                      : scenario.category === 'Boundary & Edge'
                                      ? 'bg-amber-500'
                                      : 'bg-rose-500'
                                  }`} />
                                  {scenario.category}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-pill border ${
                                scenario.status === 'Pass'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : scenario.status === 'Fail'
                                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                                  : scenario.status === 'Blocked'
                                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}>
                                {scenario.status}
                              </span>
                              <button
                                onClick={() => handleDeleteScenario(scenario.id)}
                                className="p-1 rounded-full text-txt-muted hover:text-rose-600 transition"
                                title="Delete scenario row"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Prompt Text */}
                          <div className="text-xs sm:text-sm font-medium text-dark-chassis leading-relaxed">
                            {scenario.prompt_text}
                          </div>

                          {/* Traceability */}
                          {scenario.traceability && (
                            <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
                              <div className="flex flex-wrap items-center gap-1">
                                {scenario.traceability.exploration_dimensions?.map((dim, dIdx) => (
                                  <span key={dIdx} className="px-2 py-0.5 rounded-pill text-[9px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                    {dim}
                                  </span>
                                ))}
                              </div>
                              {scenario.traceability.derived_from && (
                                <details className="text-[10px] text-txt-muted group/trace">
                                  <summary className="cursor-pointer hover:text-dark-chassis font-medium inline-flex items-center gap-1 text-[10px] py-0.5">
                                    <Info className="w-3 h-3 text-indigo-500" /> Traceability Reason
                                  </summary>
                                  <div className="mt-1 p-2.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-0.5 text-[10px] text-slate-700">
                                    {scenario.traceability.derived_from.failure_state && (
                                      <div><strong className="text-rose-700">Failure State:</strong> {scenario.traceability.derived_from.failure_state.join('; ')}</div>
                                    )}
                                    {scenario.traceability.derived_from.risk && (
                                      <div><strong className="text-amber-700">Testing Risk:</strong> {scenario.traceability.derived_from.risk.join('; ')}</div>
                                    )}
                                    {scenario.traceability.derived_from.feature && (
                                      <div><strong className="text-blue-700">Feature Scope:</strong> {scenario.traceability.derived_from.feature.join('; ')}</div>
                                    )}
                                  </div>
                                </details>
                              )}
                            </div>
                          )}

                          {/* 1-Click Thumb-Friendly Action Buttons (Pill Integrity) */}
                          <div className="pt-2 border-t border-slate-100 space-y-2">
                            <div className="text-[11px] font-semibold text-txt-muted">Execute Outcome:</div>
                            <div className="grid grid-cols-3 gap-2">
                              <button
                                type="button"
                                onClick={() => handleUpdateScenario(scenario.id, { status: 'Pass' })}
                                className={`min-h-[44px] py-2 px-3 rounded-pill text-xs font-bold transition border flex items-center justify-center gap-1.5 active:scale-95 ${
                                  scenario.status === 'Pass'
                                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                                }`}
                              >
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                <span>Pass</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleUpdateScenario(scenario.id, { status: 'Fail' })}
                                className={`min-h-[44px] py-2 px-3 rounded-pill text-xs font-bold transition border flex items-center justify-center gap-1.5 active:scale-95 ${
                                  scenario.status === 'Fail'
                                    ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                                    : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200'
                                }`}
                              >
                                <XCircle className="w-4 h-4 shrink-0" />
                                <span>Fail</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleUpdateScenario(scenario.id, { status: 'Blocked' })}
                                className={`min-h-[44px] py-2 px-3 rounded-pill text-xs font-bold transition border flex items-center justify-center gap-1.5 active:scale-95 ${
                                  scenario.status === 'Blocked'
                                    ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                                    : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                                }`}
                              >
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                <span>Block</span>
                              </button>
                            </div>

                            {scenario.status !== 'Untested' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateScenario(scenario.id, { status: 'Untested' })}
                                className="text-xs text-txt-muted hover:text-dark-chassis flex items-center gap-1.5 py-1 px-2.5 rounded-pill hover:bg-slate-100 transition"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Reset to Untested</span>
                              </button>
                            )}

                            {(scenario.status === 'Fail' || scenario.status === 'Blocked') && (
                              <button
                                type="button"
                                onClick={() => handleGenerateFollowUp(scenario)}
                                disabled={isGeneratingFollowUp === scenario.id}
                                className="w-full min-h-[40px] py-2 px-3 rounded-pill bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-2xs active:scale-95 disabled:opacity-50"
                              >
                                <Sparkles className={`w-3.5 h-3.5 text-rose-600 ${isGeneratingFollowUp === scenario.id ? 'animate-spin' : ''}`} />
                                <span>{isGeneratingFollowUp === scenario.id ? 'Generating Follow-up...' : 'Generate Follow-Up Charter'}</span>
                              </button>
                            )}
                          </div>

                          {/* Observations & Media Inputs */}
                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            <div>
                              <label className="text-[11px] font-semibold text-dark-chassis block mb-1">
                                Observations &amp; Notes
                              </label>
                              <textarea
                                defaultValue={scenario.observations || ''}
                                placeholder="Record empirical tester observations, replies received, or unexpected bugs..."
                                onBlur={(e) => {
                                  if (e.target.value !== scenario.observations) {
                                    handleUpdateScenario(scenario.id, { observations: e.target.value });
                                  }
                                }}
                                rows={2}
                                className="w-full text-xs p-3 rounded-2xl border border-clinical-border bg-white text-dark-chassis placeholder:text-txt-muted/70 focus:outline-none focus:border-dark-chassis transition resize-y leading-relaxed font-sans"
                              />
                              {savingScenarioId === scenario.id && (
                                <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
                                  <Check className="w-3 h-3" /> Autosaved
                                </span>
                              )}
                            </div>

                            <div>
                              <label className="text-[11px] font-semibold text-dark-chassis block mb-1">
                                Media / Screenshot URL
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  defaultValue={scenario.media_url || ''}
                                  placeholder="https://..."
                                  onBlur={(e) => {
                                    if (e.target.value !== scenario.media_url) {
                                      handleUpdateScenario(scenario.id, { media_url: e.target.value });
                                    }
                                  }}
                                  className="flex-1 text-xs px-3.5 py-2 rounded-pill border border-clinical-border bg-white text-dark-secondary placeholder:text-txt-muted/60 focus:outline-none focus:border-dark-chassis font-mono"
                                />
                                {scenario.media_url && (
                                  <a
                                    href={scenario.media_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="shrink-0 min-h-[38px] px-3.5 py-1.5 rounded-pill bg-slate-100 hover:bg-slate-200 text-neon-dark text-xs font-semibold flex items-center gap-1 font-mono"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>Open</span>
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Table Footer: Add Prompt Action */}
                <div className="p-3 bg-slate-50/80 border-t border-clinical-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs">
                  <button
                    onClick={handleAddScenario}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-pill bg-white hover:bg-slate-100 text-dark-chassis font-semibold border border-clinical-border flex items-center justify-center gap-1.5 transition text-xs shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Investigation Scenario Row</span>
                  </button>

                  <div className="text-[11px] text-txt-muted font-mono text-center sm:text-right">
                    Showing {filteredScenarios.length} of {activeCharter.scenarios?.length || 0} scenarios
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Evidence Context Pack & Audit Modal */}
      <ContextPackModal
        isOpen={isContextPackModalOpen}
        onClose={() => setIsContextPackModalOpen(false)}
        contextPack={activeContextPack}
        validationReport={activeValidationReport}
        featureName={currentFeature?.name}
      />

      {/* Fallback Multi-Feature & App-Wide Charter Runner Modal */}
      {!onOpenRunner && (
        <MultiCharterRunnerModal
          isOpen={isLocalRunnerOpen}
          onClose={() => setIsLocalRunnerOpen(false)}
          currentProject={currentProject}
          allProjects={allProjects || (currentProject ? [currentProject] : [])}
          allFeatures={allFeatures || (currentFeature ? [currentFeature] : [])}
          currentFeature={currentFeature}
          onRefreshData={onRefreshCharters}
        />
      )}

      {/* Why Was This Generated Modal */}
      <CharterWhyGeneratedModal
        isOpen={isWhyGeneratedOpen}
        onClose={() => setIsWhyGeneratedOpen(false)}
        charter={activeWhyCharter}
        contextPack={activeContextPack}
        qualityGateReport={(currentFeature?.advanced_context as any)?.latest_validation_report || (activeCharter as any)?.quality_gate_report}
        generationMetadata={(currentFeature?.advanced_context as any)?.latest_mcp_data?.generation_metadata}
      />

      {/* Human Review Modal */}
      <CharterReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        charter={activeReviewCharter}
        onReviewSubmitted={async () => {
          await onRefreshCharters();
        }}
      />
    </div>
  );
}
