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
  Box
} from 'lucide-react';

interface ExploratoryChartersViewProps {
  currentFeature: Feature | null;
  currentProject: Project | null;
  charters: QACharter[];
  onRefreshCharters: () => Promise<void>;
}

export function ExploratoryChartersView({
  currentFeature,
  currentProject,
  charters,
  onRefreshCharters
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

  // Copy Formatted Table to Clipboard for Google Sheets / Docs / Excel
  const handleCopyFormattedTable = () => {
    if (!activeCharter) return;

    let text = `${activeCharter.charter_code} | ${activeCharter.title}\n`;
    text += `Mission: ${activeCharter.mission}\n`;
    text += `User Persona: ${activeCharter.user_persona}\n`;
    text += `Starting Condition: ${activeCharter.starting_condition}\n`;
    text += `Expected Outcome: ${activeCharter.expected_outcome}\n\n`;
    text += `Prompt ID\tExploration Prompts & Investigative Scenarios\tStatus\tObservations & Notes\tMedia URL\n`;

    activeCharter.scenarios?.forEach(s => {
      text += `${s.prompt_id}\t${s.prompt_text}\t${s.status}\t${s.observations || ''}\t${s.media_url || ''}\n`;
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

  return (
    <div className="flex-1 flex flex-col h-full bg-clinical-warm overflow-hidden">
      {/* Top Header Bar */}
      <div className="px-6 py-3.5 bg-white border-b border-clinical-border flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-dark-chassis text-neon flex items-center justify-center font-mono text-xs font-bold shadow-xs">
            ET
          </div>
          <div>
            <div className="flex items-center gap-2">
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
        <div className="flex items-center gap-2">
          {activeContextPack && (
            <button
              onClick={() => setIsContextPackModalOpen(true)}
              className="px-3 py-1.5 rounded-pill bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-medium flex items-center gap-1.5 transition"
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
            <span className="text-[10px] text-txt-muted font-mono hidden md:flex items-center gap-1 px-2.5 py-1 bg-clinical-warm rounded-full border border-clinical-border" title="No Gemini API Key found in Settings. Click Settings icon to add key for live multimodal vision.">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
              Offline Engine Active
            </span>
          )}

          <button
            onClick={handleCopyFormattedTable}
            disabled={!activeCharter}
            className="px-3 py-1.5 rounded-pill bg-dark-tertiary/10 hover:bg-dark-tertiary/20 text-dark-chassis text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-40"
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
            onClick={handleGenerateCharters}
            disabled={isGenerating || !currentFeature}
            className="px-3.5 py-1.5 rounded-pill bg-neon hover:bg-neon-bright text-dark-chassis text-xs font-semibold flex items-center gap-1.5 transition shadow-sm active:scale-95 disabled:opacity-50"
          >
            <BrainCircuit className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Synthesizing Charters...' : 'Generate Charters with AI'}
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
          <div className="px-6 py-2 bg-clinical-warm/80 border-b border-clinical-border flex items-center justify-between gap-3 shrink-0 overflow-x-auto no-scrollbar">
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
              <span className="text-[11px] text-txt-muted font-medium mr-1">Filter:</span>
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
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
            {activeCharter && (
              <div className="bg-white rounded-[20px] border border-clinical-border shadow-xs overflow-hidden">
                {/* Charter Context Header (Exact format requested) */}
                <div className="p-5 border-b border-clinical-border bg-gradient-to-r from-slate-50/80 to-white">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h1 className="text-base sm:text-lg font-extrabold text-dark-chassis tracking-tight font-sans">
                      {activeCharter.charter_code} <span className="text-txt-muted font-normal">|</span> {activeCharter.title.replace(/^[A-Z0-9-]+\s*\|\s*/, '')}
                    </h1>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-neon/20 text-dark-chassis border border-neon/30">
                      {activeCharter.status}
                    </span>
                  </div>

                  {/* 4 Core Mission Pillars */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-start gap-1.5">
                      <span className="font-bold text-dark-chassis shrink-0 w-32">Mission:</span>
                      <span className="text-dark-secondary leading-relaxed">{activeCharter.mission}</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="font-bold text-dark-chassis shrink-0 w-32">User Persona:</span>
                      <span className="text-dark-secondary leading-relaxed">{activeCharter.user_persona}</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="font-bold text-dark-chassis shrink-0 w-32">Starting Condition:</span>
                      <span className="text-dark-secondary leading-relaxed">{activeCharter.starting_condition}</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="font-bold text-dark-chassis shrink-0 w-32">Expected Outcome:</span>
                      <span className="text-dark-secondary leading-relaxed">{activeCharter.expected_outcome}</span>
                    </div>
                  </div>
                </div>

                {/* Scenarios Table (Exact layout & dark header matching user document) */}
                <div className="overflow-x-auto">
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

                {/* Table Footer: Add Prompt Action */}
                <div className="p-3 bg-slate-50/80 border-t border-clinical-border flex items-center justify-between text-xs">
                  <button
                    onClick={handleAddScenario}
                    className="px-3 py-1.5 rounded-pill bg-white hover:bg-slate-100 text-dark-chassis font-semibold border border-clinical-border flex items-center gap-1.5 transition text-xs shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Investigation Scenario Row
                  </button>

                  <div className="text-[11px] text-txt-muted font-mono">
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
    </div>
  );
}
