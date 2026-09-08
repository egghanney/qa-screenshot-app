'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  X, 
  Play, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RotateCcw, 
  ChevronRight, 
  ChevronLeft, 
  Download, 
  Copy, 
  Check, 
  Layers, 
  ClipboardList, 
  Smartphone, 
  Filter, 
  Sparkles,
  Search,
  Sliders,
  ExternalLink,
  FileText,
  FileSpreadsheet,
  History,
  Eye,
  ArrowRight,
  Clock,
  ShieldCheck,
  ChevronDown,
  FileDown,
  CheckCheck
} from 'lucide-react';
import { Project, Feature, QACharter, CharterScenario, ScenarioStatus } from '@/lib/types';
import { supabase } from '@/lib/supabase/client';
import { 
  exportDefectReportPdf, 
  exportDefectReportMarkdown, 
  exportDefectReportCsv, 
  triggerFileDownload, 
  extractDefects, 
  DefectReportMetadata 
} from '@/lib/defectReportExport';

interface MultiCharterRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: Project | null;
  allProjects: Project[];
  allFeatures: Feature[];
  currentFeature?: Feature | null;
  onRefreshData?: () => Promise<void>;
}

interface RunnableScenario extends CharterScenario {
  featureName: string;
  charterCode: string;
  charterTitle: string;
  charterMission: string;
  userPersona?: string;
  startingCondition?: string;
  expectedOutcome?: string;
}

interface RunSessionRecord {
  id: string;
  projectId: string;
  projectName: string;
  featureNames: string[];
  startTime: string;
  lastUpdated: string;
  totalScenarios: number;
  passedCount: number;
  failedCount: number;
  blockedCount: number;
  untestedCount: number;
  isCompleted: boolean;
}

export function MultiCharterRunnerModal({
  isOpen,
  onClose,
  currentProject,
  allProjects,
  allFeatures,
  currentFeature,
  onRefreshData
}: MultiCharterRunnerModalProps) {
  // Phase: 'setup' (scope selection) or 'running' (execution)
  const [phase, setPhase] = useState<'setup' | 'running'>('setup');

  // Selected Scope
  const [selectedProjectId, setSelectedProjectId] = useState<string>(currentProject?.id || '');
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<Set<string>>(new Set());
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
  const [isLoadingCharters, setIsLoadingCharters] = useState(false);

  // Loaded Charters for the chosen scope
  const [loadedCharters, setLoadedCharters] = useState<QACharter[]>([]);
  const [runnableScenarios, setRunnableScenarios] = useState<RunnableScenario[]>([]);

  // Execution Views: 'charter' (default workspace-like view), 'stepper' (card mode), 'history' (run sessions)
  const [viewMode, setViewMode] = useState<'charter' | 'stepper' | 'history'>('charter');
  
  // Quick Filters for Completed vs Pending Charters
  const [runFilter, setRunFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [selectedCharterId, setSelectedCharterId] = useState<string>('');
  const [scenarioStatusFilter, setScenarioStatusFilter] = useState<string>('All');

  // Stepper execution state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [activeNotes, setActiveNotes] = useState('');
  const [activeMediaUrl, setActiveMediaUrl] = useState('');
  const [savingScenarioId, setSavingScenarioId] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Run Session Records stored in localStorage
  const [runSessions, setRunSessions] = useState<RunSessionRecord[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');

  // Initialize selected project
  useEffect(() => {
    if (currentProject) {
      setSelectedProjectId(currentProject.id);
    } else if (allProjects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(allProjects[0].id);
    }
  }, [currentProject, allProjects]);

  // Load past run sessions from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('qa_run_sessions');
        if (stored) {
          setRunSessions(JSON.parse(stored));
        }
      } catch (e) {
        console.error('Failed reading past run sessions', e);
      }
    }
  }, [isOpen]);

  // Features belonging to selected project
  const projectFeatures = useMemo(() => {
    if (!selectedProjectId || selectedProjectId === 'all') return allFeatures;
    return allFeatures.filter(f => f.project_id === selectedProjectId);
  }, [allFeatures, selectedProjectId]);

  const activeProject = useMemo(() => {
    return allProjects.find(p => p.id === selectedProjectId) || currentProject;
  }, [allProjects, selectedProjectId, currentProject]);

  // Default: select all features under the project when project changes
  useEffect(() => {
    if (projectFeatures.length > 0) {
      setSelectedFeatureIds(new Set(projectFeatures.map(f => f.id)));
    } else {
      setSelectedFeatureIds(new Set());
    }
  }, [projectFeatures]);

  // Fetch charters whenever scope is loaded or when entering setup
  const loadChartersForScope = useCallback(async () => {
    if (selectedFeatureIds.size === 0) {
      setLoadedCharters([]);
      setRunnableScenarios([]);
      return;
    }

    setIsLoadingCharters(true);
    try {
      const featIds = Array.from(selectedFeatureIds);
      
      const { data: chartersData, error: cErr } = await supabase
        .from('qa_charters')
        .select('*')
        .in('feature_id', featIds)
        .order('charter_code', { ascending: true });

      if (cErr) throw cErr;

      const charterIds = (chartersData || []).map(c => c.id);
      let scenariosData: CharterScenario[] = [];

      if (charterIds.length > 0) {
        const { data: sData, error: sErr } = await supabase
          .from('qa_charter_scenarios')
          .select('*')
          .in('charter_id', charterIds)
          .order('sort_order', { ascending: true });

        if (sErr) throw sErr;
        scenariosData = sData || [];
      }

      const featMap = new Map(allFeatures.map(f => [f.id, f]));

      const scenariosByCharter = scenariosData.reduce((acc: Record<string, CharterScenario[]>, s) => {
        if (!acc[s.charter_id]) acc[s.charter_id] = [];
        acc[s.charter_id].push(s);
        return acc;
      }, {});

      const enrichedCharters: QACharter[] = (chartersData || []).map(c => ({
        ...c,
        scenarios: scenariosByCharter[c.id] || []
      }));

      setLoadedCharters(enrichedCharters);

      if (enrichedCharters.length > 0 && !selectedCharterId) {
        setSelectedCharterId(enrichedCharters[0].id);
      }

      // Flatten into runnable scenarios list
      const flattened: RunnableScenario[] = [];
      enrichedCharters.forEach(c => {
        const feat = c.feature_id ? featMap.get(c.feature_id) : undefined;
        const featName = feat?.name || 'Feature';
        (c.scenarios || []).forEach(s => {
          flattened.push({
            ...s,
            featureName: featName,
            charterCode: c.charter_code,
            charterTitle: c.title,
            charterMission: c.mission,
            userPersona: c.user_persona,
            startingCondition: c.starting_condition,
            expectedOutcome: c.expected_outcome
          });
        });
      });

      setRunnableScenarios(flattened);
    } catch (err) {
      console.error('Error loading charters for runner:', err);
    } finally {
      setIsLoadingCharters(false);
    }
  }, [selectedFeatureIds, allFeatures, selectedCharterId]);

  useEffect(() => {
    if (isOpen) {
      loadChartersForScope();
    }
  }, [isOpen, loadChartersForScope]);

  // Overall metric counters
  const counters = useMemo(() => {
    let passed = 0;
    let failed = 0;
    let blocked = 0;
    let untested = 0;

    runnableScenarios.forEach(s => {
      if (s.status === 'Pass') passed++;
      else if (s.status === 'Fail') failed++;
      else if (s.status === 'Blocked') blocked++;
      else untested++;
    });

    const total = runnableScenarios.length;
    const executed = passed + failed + blocked;
    const percent = total > 0 ? Math.round((executed / total) * 100) : 0;
    const isCompleted = total > 0 && untested === 0;

    return { total, passed, failed, blocked, untested, executed, percent, isCompleted };
  }, [runnableScenarios]);

  // Categorize charters into Completed vs Pending
  const charterRunStatus = useMemo(() => {
    const completed: QACharter[] = [];
    const pending: QACharter[] = [];

    loadedCharters.forEach(c => {
      const sc = c.scenarios || [];
      const hasUntested = sc.some(s => s.status === 'Untested');
      if (sc.length > 0 && !hasUntested) {
        completed.push(c);
      } else {
        pending.push(c);
      }
    });

    return { completed, pending };
  }, [loadedCharters]);

  // Charters visible based on runFilter ('all' | 'pending' | 'completed')
  const visibleCharters = useMemo(() => {
    if (runFilter === 'completed') return charterRunStatus.completed;
    if (runFilter === 'pending') return charterRunStatus.pending;
    return loadedCharters;
  }, [loadedCharters, charterRunStatus, runFilter]);

  // Sync selectedCharterId if current one is filtered out
  useEffect(() => {
    if (visibleCharters.length > 0) {
      if (!visibleCharters.some(c => c.id === selectedCharterId)) {
        setSelectedCharterId(visibleCharters[0].id);
      }
    }
  }, [visibleCharters, selectedCharterId]);

  const activeCharter = useMemo(() => {
    return loadedCharters.find(c => c.id === selectedCharterId) || loadedCharters[0];
  }, [loadedCharters, selectedCharterId]);

  // Scenarios for active charter in Charter View
  const activeCharterScenarios = useMemo(() => {
    if (!activeCharter?.scenarios) return [];
    if (scenarioStatusFilter === 'All') return activeCharter.scenarios;
    return activeCharter.scenarios.filter(s => s.status === scenarioStatusFilter);
  }, [activeCharter, scenarioStatusFilter]);

  // Active scenario for Guided Stepper mode
  const filteredStepperRunnable = useMemo(() => {
    if (selectedCategoryFilter === 'All') return runnableScenarios;
    return runnableScenarios.filter(s => s.category === selectedCategoryFilter);
  }, [runnableScenarios, selectedCategoryFilter]);

  const currentStepperScenario = filteredStepperRunnable[currentIndex] || filteredStepperRunnable[0];

  useEffect(() => {
    if (currentStepperScenario) {
      setActiveNotes(currentStepperScenario.observations || '');
      setActiveMediaUrl(currentStepperScenario.media_url || '');
    }
  }, [currentStepperScenario]);

  // Update session record in localStorage
  const persistRunSession = useCallback(() => {
    if (!activeProject || runnableScenarios.length === 0) return;
    try {
      const selectedNames = projectFeatures
        .filter(f => selectedFeatureIds.has(f.id))
        .map(f => f.name);

      const sessionId = currentSessionId || `session_${Date.now()}`;
      if (!currentSessionId) setCurrentSessionId(sessionId);

      const session: RunSessionRecord = {
        id: sessionId,
        projectId: activeProject.id,
        projectName: activeProject.name,
        featureNames: selectedNames,
        startTime: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        totalScenarios: counters.total,
        passedCount: counters.passed,
        failedCount: counters.failed,
        blockedCount: counters.blocked,
        untestedCount: counters.untested,
        isCompleted: counters.isCompleted
      };

      const existing: RunSessionRecord[] = JSON.parse(localStorage.getItem('qa_run_sessions') || '[]');
      const filtered = existing.filter(s => s.id !== sessionId);
      const updated = [session, ...filtered].slice(0, 20); // keep last 20

      localStorage.setItem('qa_run_sessions', JSON.stringify(updated));
      setRunSessions(updated);
    } catch (e) {
      console.error('Failed updating run session', e);
    }
  }, [activeProject, runnableScenarios.length, projectFeatures, selectedFeatureIds, currentSessionId, counters]);

  // Update individual scenario (used in both Charter View table and Stepper)
  const handleUpdateScenario = async (
    scenarioId: string,
    updates: Partial<CharterScenario>,
    advanceStepper = false
  ) => {
    setSavingScenarioId(scenarioId);

    // 1. Optimistic update in runnableScenarios
    setRunnableScenarios(prev => prev.map(s => s.id === scenarioId ? { ...s, ...updates } : s));

    // 2. Optimistic update in loadedCharters
    setLoadedCharters(prev => prev.map(c => {
      if (!c.scenarios?.some(s => s.id === scenarioId)) return c;
      return {
        ...c,
        scenarios: c.scenarios.map(s => s.id === scenarioId ? { ...s, ...updates } : s)
      };
    }));

    try {
      await fetch('/api/charters', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'scenario',
          scenario_id: scenarioId,
          ...updates
        })
      });

      // Save to localStorage session
      persistRunSession();
    } catch (err) {
      console.error('Failed saving scenario:', err);
    } finally {
      setSavingScenarioId(null);
    }

    if (advanceStepper && currentIndex < filteredStepperRunnable.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  // Keyboard navigation for Stepper
  useEffect(() => {
    if (!isOpen || phase !== 'running' || viewMode !== 'stepper') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        if (currentStepperScenario) {
          handleUpdateScenario(currentStepperScenario.id, { 
            status: 'Pass', 
            observations: activeNotes, 
            media_url: activeMediaUrl 
          }, true);
        }
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        if (currentStepperScenario) {
          handleUpdateScenario(currentStepperScenario.id, { 
            status: 'Fail', 
            observations: activeNotes, 
            media_url: activeMediaUrl 
          }, true);
        }
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        if (currentStepperScenario) {
          handleUpdateScenario(currentStepperScenario.id, { 
            status: 'Blocked', 
            observations: activeNotes, 
            media_url: activeMediaUrl 
          }, true);
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (currentIndex < filteredStepperRunnable.length - 1) setCurrentIndex(prev => prev + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, phase, viewMode, currentIndex, filteredStepperRunnable.length, currentStepperScenario, activeNotes, activeMediaUrl]);

  // Defect Report Metadata Builder
  const getDefectReportMetadata = (): DefectReportMetadata => {
    const featMap = new Map(allFeatures.map(f => [f.id, f.name]));
    const featureNames = Array.from(selectedFeatureIds).map(id => featMap.get(id) || 'Feature');

    return {
      projectName: activeProject?.name || 'QA Test Studio',
      platform: activeProject?.platform || 'General',
      featureNames,
      totalScenarios: counters.total,
      passedCount: counters.passed,
      failedCount: counters.failed,
      blockedCount: counters.blocked,
      untestedCount: counters.untested,
      passRate: counters.percent,
      generatedDate: new Date().toLocaleDateString()
    };
  };

  // Export PDF Defect Report
  const handleDownloadDefectPdf = () => {
    const meta = getDefectReportMetadata();
    const featMap = new Map(allFeatures.map(f => [f.id, f.name]));
    const defects = extractDefects(loadedCharters, featMap);
    exportDefectReportPdf(meta, defects);
    setShowExportMenu(false);
  };

  // Export Markdown Defect Report
  const handleDownloadDefectMarkdown = () => {
    const meta = getDefectReportMetadata();
    const featMap = new Map(allFeatures.map(f => [f.id, f.name]));
    const defects = extractDefects(loadedCharters, featMap);
    const md = exportDefectReportMarkdown(meta, defects);
    const filename = `${meta.projectName.replace(/\s+/g, '_')}_Defect_Report.md`;
    triggerFileDownload(md, filename, 'text/markdown;charset=utf-8;');
    setShowExportMenu(false);
  };

  // Export CSV Defect Report
  const handleDownloadDefectCsv = () => {
    const meta = getDefectReportMetadata();
    const featMap = new Map(allFeatures.map(f => [f.id, f.name]));
    const defects = extractDefects(loadedCharters, featMap);
    const csv = exportDefectReportCsv(meta, defects);
    const filename = `${meta.projectName.replace(/\s+/g, '_')}_Defects.csv`;
    triggerFileDownload(csv, filename, 'text/csv;charset=utf-8;');
    setShowExportMenu(false);
  };

  // Copy Summary to Clipboard
  const handleCopySummary = () => {
    const meta = getDefectReportMetadata();
    const featMap = new Map(allFeatures.map(f => [f.id, f.name]));
    const defects = extractDefects(loadedCharters, featMap);
    const md = exportDefectReportMarkdown(meta, defects);
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setShowExportMenu(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-dark-chassis/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-qa-white rounded-[26px] border border-qa-border shadow-modal max-w-6xl w-full max-h-[95vh] flex flex-col overflow-hidden text-txt-primary">
        
        {/* Modal Top Bar */}
        <div className="bg-dark-chassis text-white px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-dark-secondary shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-neon text-dark-chassis flex items-center justify-center font-bold text-xs shadow-sm">
              <Play className="w-4 h-4 fill-dark-chassis" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight text-white">
                  {phase === 'setup' ? 'Test Run Setup' : `Test Run Studio: ${activeProject?.name || 'QA App'}`}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-dark-secondary text-neon border border-dark-tertiary">
                  {phase === 'setup' ? 'SCOPE CONFIGURATION' : 'ACTIVE EXECUTION'}
                </span>
                {counters.isCompleted && phase === 'running' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <CheckCheck className="w-3 h-3" />
                    RUN 100% COMPLETE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-txt-muted">
                {phase === 'setup'
                  ? 'Select application and feature flows to bundle into this test execution cycle'
                  : `Running suite across ${selectedFeatureIds.size} feature${selectedFeatureIds.size === 1 ? '' : 's'} (${loadedCharters.length} charters, ${counters.total} scenarios)`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {phase === 'running' && (
              <>
                {/* Defect Report Export Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="px-3 py-1.5 rounded-pill text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition flex items-center gap-1.5 shadow-sm active:scale-95"
                    title="Export failure defect report for developers to fix bugs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Defect Report</span>
                    <ChevronDown className="w-3 h-3 opacity-80" />
                  </button>

                  {showExportMenu && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-qa-border shadow-xl p-2 z-50 animate-in fade-in-50 zoom-in-95 text-xs text-dark-chassis">
                      <div className="px-3 py-2 border-b border-qa-border mb-1">
                        <span className="font-bold block">Developer Defect Report</span>
                        <span className="text-[10px] text-txt-muted">
                          {counters.failed} Failures &amp; {counters.blocked} Blockers detected
                        </span>
                      </div>

                      <button
                        onClick={handleDownloadDefectPdf}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-qa-warm flex items-center gap-2 transition"
                      >
                        <FileDown className="w-4 h-4 text-rose-600" />
                        <div>
                          <span className="font-semibold block">Download as PDF</span>
                          <span className="text-[10px] text-txt-muted">Executive summary &amp; bug tickets</span>
                        </div>
                      </button>

                      <button
                        onClick={handleDownloadDefectMarkdown}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-qa-warm flex items-center gap-2 transition"
                      >
                        <FileText className="w-4 h-4 text-indigo-600" />
                        <div>
                          <span className="font-semibold block">Download Markdown (.md)</span>
                          <span className="text-[10px] text-txt-muted">Formatted for Jira, Linear, GitHub</span>
                        </div>
                      </button>

                      <button
                        onClick={handleDownloadDefectCsv}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-qa-warm flex items-center gap-2 transition"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <div>
                          <span className="font-semibold block">Download CSV (.csv)</span>
                          <span className="text-[10px] text-txt-muted">Tabular format for spreadsheets</span>
                        </div>
                      </button>

                      <div className="pt-1 mt-1 border-t border-qa-border">
                        <button
                          onClick={handleCopySummary}
                          className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-qa-warm flex items-center gap-2 text-[11px] text-dark-secondary"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Markdown to Clipboard</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Scope Switcher */}
                <button
                  onClick={() => setPhase('setup')}
                  className="px-3 py-1.5 rounded-pill text-xs font-semibold bg-dark-secondary hover:bg-dark-tertiary text-white transition flex items-center gap-1.5 border border-dark-tertiary"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Scope</span>
                </button>
              </>
            )}

            <button
              onClick={() => {
                if (onRefreshData) onRefreshData();
                onClose();
              }}
              className="w-7 h-7 rounded-full bg-dark-secondary hover:bg-dark-tertiary text-txt-muted hover:text-white flex items-center justify-center transition border border-dark-tertiary"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PHASE 1: SCOPE CONFIGURATION */}
        {phase === 'setup' && (
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            {/* Target Application Picker */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-dark-chassis uppercase tracking-wider block">
                1. Select Target Application
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {allProjects.map(proj => {
                  const isSelected = selectedProjectId === proj.id;
                  const projFeats = allFeatures.filter(f => f.project_id === proj.id);

                  return (
                    <button
                      key={proj.id}
                      type="button"
                      onClick={() => setSelectedProjectId(proj.id)}
                      className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between space-y-2 ${
                        isSelected 
                          ? 'bg-dark-chassis text-white border-dark-chassis shadow-card' 
                          : 'bg-qa-surface text-txt-primary border-qa-border hover:bg-qa-warm'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{proj.name}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          isSelected ? 'bg-dark-secondary text-neon' : 'bg-qa-border text-txt-secondary'
                        }`}>
                          {proj.platform || 'General'}
                        </span>
                      </div>
                      <span className={`text-[11px] ${isSelected ? 'text-txt-muted' : 'text-txt-secondary'}`}>
                        {projFeats.length} {projFeats.length === 1 ? 'Feature' : 'Features'} available
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Feature Multi-Select */}
            <div className="space-y-3 pt-4 border-t border-qa-border">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-dark-chassis uppercase tracking-wider block">
                    2. Select Features to Include in This Run
                  </label>
                  <span className="text-[11px] text-txt-secondary">
                    Run tests for a single feature or bundle multiple features together
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedFeatureIds(new Set(projectFeatures.map(f => f.id)))}
                    className="px-2.5 py-1 rounded-pill text-[11px] font-semibold bg-qa-warm hover:bg-qa-border text-dark-chassis border border-qa-border transition"
                  >
                    Select All ({projectFeatures.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFeatureIds(new Set())}
                    className="px-2.5 py-1 rounded-pill text-[11px] font-semibold bg-qa-warm hover:bg-qa-border text-txt-muted border border-qa-border transition"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {projectFeatures.length === 0 ? (
                <div className="p-8 text-center bg-qa-surface rounded-2xl border border-qa-border text-xs text-txt-secondary">
                  No features found in this application yet. Create a feature flow first to generate charters.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {projectFeatures.map(feat => {
                    const isChecked = selectedFeatureIds.has(feat.id);
                    return (
                      <label
                        key={feat.id}
                        className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition ${
                          isChecked 
                            ? 'bg-indigo-50/70 border-indigo-300 shadow-2xs' 
                            : 'bg-qa-surface border-qa-border hover:bg-qa-warm'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const next = new Set(selectedFeatureIds);
                              if (e.target.checked) next.add(feat.id);
                              else next.delete(feat.id);
                              setSelectedFeatureIds(next);
                            }}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-qa-border cursor-pointer"
                          />
                          <div>
                            <span className="text-xs font-bold text-dark-chassis block">
                              {feat.name}
                            </span>
                            <span className="text-[10px] text-txt-secondary line-clamp-1">
                              {feat.purpose || feat.description || 'Core flow'}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-qa-white border border-qa-border text-slate-700">
                          v{feat.version || '1.0'}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Launch Banner */}
            <div className="p-4 rounded-2xl bg-dark-chassis text-white flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-neon">
                    {runnableScenarios.length} Scenarios Ready for Execution
                  </span>
                  <span className="text-[11px] text-txt-muted">
                    across {loadedCharters.length} charters in {selectedFeatureIds.size} feature(s)
                  </span>
                </div>
                <p className="text-[11px] text-txt-muted mt-0.5">
                  Full 360° coverage: Golden Path, Alternative Flows, Boundary checks, and Failure/Recovery
                </p>
              </div>

              <button
                type="button"
                disabled={isLoadingCharters || runnableScenarios.length === 0}
                onClick={() => {
                  setCurrentIndex(0);
                  setPhase('running');
                  persistRunSession();
                }}
                className="px-6 py-2.5 rounded-pill bg-neon hover:bg-neon-bright text-dark-chassis text-xs font-bold transition shadow-card flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-dark-chassis" />
                <span>Start Test Execution Run</span>
              </button>
            </div>
          </div>
        )}

        {/* PHASE 2: ACTIVE EXECUTION RUNNER */}
        {phase === 'running' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Run Progress & Metrics Bar */}
            <div className="bg-qa-surface p-4 border-b border-qa-border flex flex-wrap items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-dark-chassis">
                      Run Progress: {counters.executed} of {counters.total}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-indigo-700">
                      ({counters.percent}%)
                    </span>
                  </div>
                  {/* Multi-color Progress Bar */}
                  <div className="w-48 sm:w-64 h-2 bg-qa-border rounded-full overflow-hidden flex">
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{ width: `${counters.total > 0 ? (counters.passed / counters.total) * 100 : 0}%` }}
                    />
                    <div 
                      className="bg-rose-500 h-full transition-all duration-300"
                      style={{ width: `${counters.total > 0 ? (counters.failed / counters.total) * 100 : 0}%` }}
                    />
                    <div 
                      className="bg-amber-500 h-full transition-all duration-300"
                      style={{ width: `${counters.total > 0 ? (counters.blocked / counters.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Counters */}
                <div className="flex items-center gap-1.5 text-[11px] font-mono">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                    PASS: {counters.passed}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold border border-rose-300">
                    FAIL: {counters.failed}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold border border-amber-300">
                    BLOCK: {counters.blocked}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-qa-white text-slate-700 font-medium border border-qa-border">
                    LEFT: {counters.untested}
                  </span>
                </div>
              </div>

              {/* View Switcher: Charter View (Default) vs Guided Stepper vs Run History */}
              <div className="flex items-center gap-1.5 bg-qa-warm p-1 rounded-pill border border-qa-border">
                <button
                  onClick={() => setViewMode('charter')}
                  className={`px-3 py-1 rounded-pill text-xs font-semibold transition flex items-center gap-1.5 ${
                    viewMode === 'charter'
                      ? 'bg-dark-chassis text-white shadow-2xs'
                      : 'text-txt-muted hover:text-dark-chassis'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Charter View</span>
                </button>

                <button
                  onClick={() => setViewMode('stepper')}
                  className={`px-3 py-1 rounded-pill text-xs font-semibold transition flex items-center gap-1.5 ${
                    viewMode === 'stepper'
                      ? 'bg-dark-chassis text-white shadow-2xs'
                      : 'text-txt-muted hover:text-dark-chassis'
                  }`}
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Guided Stepper</span>
                </button>

                <button
                  onClick={() => setViewMode('history')}
                  className={`px-3 py-1 rounded-pill text-xs font-semibold transition flex items-center gap-1.5 ${
                    viewMode === 'history'
                      ? 'bg-dark-chassis text-white shadow-2xs'
                      : 'text-txt-muted hover:text-dark-chassis'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Run History ({runSessions.length})</span>
                </button>
              </div>
            </div>

            {/* VIEW 1: CHARTER-CENTRIC VIEW (MATCHING WORKSPACE CHARTERS VIEW) */}
            {viewMode === 'charter' && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                
                {/* Secondary Sub-Bar: Quick Filter for Completed / Pending Charters + Charter Tabs */}
                <div className="px-6 py-2.5 bg-clinical-warm/80 border-b border-clinical-border flex flex-wrap items-center justify-between gap-3 shrink-0">
                  {/* Filter: All vs Pending Runs vs Completed Runs */}
                  <div className="flex items-center gap-1 bg-white p-1 rounded-full border border-clinical-border shadow-2xs text-xs">
                    <span className="text-[10px] font-mono text-txt-muted px-2 uppercase font-bold">Scope:</span>
                    <button
                      onClick={() => setRunFilter('all')}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition ${
                        runFilter === 'all'
                          ? 'bg-dark-chassis text-white shadow-xs'
                          : 'text-txt-secondary hover:text-dark-chassis'
                      }`}
                    >
                      All Charters ({loadedCharters.length})
                    </button>
                    <button
                      onClick={() => setRunFilter('pending')}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition flex items-center gap-1 ${
                        runFilter === 'pending'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'text-amber-800 hover:bg-amber-50'
                      }`}
                    >
                      <span>Pending Runs ({charterRunStatus.pending.length})</span>
                    </button>
                    <button
                      onClick={() => setRunFilter('completed')}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition flex items-center gap-1 ${
                        runFilter === 'completed'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-emerald-800 hover:bg-emerald-50'
                      }`}
                    >
                      <span>Completed Runs ({charterRunStatus.completed.length})</span>
                    </button>
                  </div>

                  {/* Scenario Status Filter */}
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-[11px] text-txt-muted font-medium mr-1">Status:</span>
                    {(['All', 'Pass', 'Fail', 'Blocked', 'Untested'] as const).map(st => {
                      const isActive = scenarioStatusFilter === st;
                      return (
                        <button
                          key={st}
                          onClick={() => setScenarioStatusFilter(st)}
                          className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition ${
                            isActive
                              ? 'bg-dark-chassis text-white font-semibold'
                              : 'bg-white text-txt-muted hover:text-dark-chassis border border-clinical-border/60'
                          }`}
                        >
                          {st}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Charter Navigation Tabs */}
                <div className="px-6 py-2 bg-white border-b border-clinical-border flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                  {visibleCharters.length === 0 ? (
                    <span className="text-xs text-txt-muted italic py-1">
                      No charters in &quot;{runFilter}&quot; filter.
                    </span>
                  ) : (
                    visibleCharters.map((charter) => {
                      const isSelected = charter.id === activeCharter?.id;
                      const sc = charter.scenarios || [];
                      const passCount = sc.filter(s => s.status === 'Pass').length;
                      const failCount = sc.filter(s => s.status === 'Fail').length;
                      const totalCount = sc.length;
                      const isCharterDone = totalCount > 0 && !sc.some(s => s.status === 'Untested');

                      return (
                        <button
                          key={charter.id}
                          onClick={() => setSelectedCharterId(charter.id)}
                          className={`px-3 py-1.5 rounded-pill text-xs font-medium flex items-center gap-2 whitespace-nowrap transition border ${
                            isSelected
                              ? 'bg-dark-chassis text-white border-dark-chassis shadow-xs font-semibold'
                              : 'bg-qa-warm hover:bg-clinical-border text-dark-secondary border-clinical-border'
                          }`}
                        >
                          <span className="font-mono">{charter.charter_code}</span>
                          <span className="truncate max-w-[130px] text-[11px] opacity-90">
                            {charter.title.replace(/^[A-Z0-9-]+\s*\|\s*/, '').trim()}
                          </span>

                          {totalCount > 0 && (
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                              isSelected 
                                ? (isCharterDone ? 'bg-neon text-dark-chassis' : 'bg-dark-secondary text-white')
                                : (isCharterDone ? 'bg-emerald-100 text-emerald-800' : 'bg-dark-secondary/10 text-txt-muted')
                            }`}>
                              {isCharterDone ? `✓ ${passCount}/${totalCount}` : `${passCount}/${totalCount}`}
                            </span>
                          )}

                          {failCount > 0 && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title={`${failCount} failures in this charter`} />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Active Charter Workspace Body */}
                <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
                  {activeCharter ? (
                    <div className="bg-white rounded-[20px] border border-clinical-border shadow-xs overflow-hidden">
                      
                      {/* Charter Context Header (Exact format requested: 4 Pillars & 360° coverage) */}
                      <div className="p-5 border-b border-clinical-border bg-gradient-to-r from-slate-50/90 to-white">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div>
                            <h1 className="text-base sm:text-lg font-extrabold text-dark-chassis tracking-tight font-sans">
                              {activeCharter.charter_code} <span className="text-txt-muted font-normal">|</span> {activeCharter.title.replace(/^[A-Z0-9-]+\s*\|\s*/, '')}
                            </h1>
                            {activeCharter.feature_id && (
                              <span className="text-[11px] text-indigo-700 font-semibold font-mono">
                                Feature: {allFeatures.find(f => f.id === activeCharter.feature_id)?.name || 'Feature Flow'}
                              </span>
                            )}
                          </div>

                          <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-neon/20 text-dark-chassis border border-neon/30">
                            {activeCharter.status || 'ACTIVE_RUN'}
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

                        {/* 360° Coverage Breakdown Chips */}
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

                      {/* Interactive Scenario Execution Table (Exact Dark Header #1E293B) */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-[#1E293B] text-white text-[11px] font-bold tracking-wider uppercase border-b border-slate-700">
                              <th className="py-3 px-4 w-24 shrink-0 font-mono">Prompt ID</th>
                              <th className="py-3 px-4 min-w-[280px]">Exploration Prompts &amp; Investigative Scenarios</th>
                              <th className="py-3 px-4 w-44">Status &amp; Quick Action</th>
                              <th className="py-3 px-4 min-w-[260px]">Observations &amp; Notes</th>
                              <th className="py-3 px-4 w-36">Media URL</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-clinical-border text-xs">
                            {activeCharterScenarios.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="py-8 text-center text-txt-muted italic">
                                  No scenarios matching filter &quot;{scenarioStatusFilter}&quot;.
                                </td>
                              </tr>
                            ) : (
                              activeCharterScenarios.map((scenario) => {
                                return (
                                  <tr key={scenario.id} className="hover:bg-slate-50/60 transition-colors group">
                                    {/* Prompt ID */}
                                    <td className="py-3.5 px-4 font-mono font-bold text-dark-chassis align-top">
                                      {scenario.prompt_id}
                                    </td>

                                    {/* Exploration Prompts & Scenarios */}
                                    <td className="py-3.5 px-4 text-dark-secondary align-top leading-relaxed">
                                      {scenario.category && (
                                        <div className="mb-1.5">
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
                                                Traceability Reason
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

                                    {/* Status & 1-Click Action Buttons */}
                                    <td className="py-3.5 px-4 align-top">
                                      <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center gap-1">
                                          <button
                                            type="button"
                                            onClick={() => handleUpdateScenario(scenario.id, { status: 'Pass' })}
                                            className={`px-2.5 py-1 rounded-pill text-[10px] font-bold transition border flex items-center gap-1 ${
                                              scenario.status === 'Pass'
                                                ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                                            }`}
                                          >
                                            <CheckCircle2 className="w-3 h-3" />
                                            Pass
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() => handleUpdateScenario(scenario.id, { status: 'Fail' })}
                                            className={`px-2.5 py-1 rounded-pill text-[10px] font-bold transition border flex items-center gap-1 ${
                                              scenario.status === 'Fail'
                                                ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                                                : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200'
                                            }`}
                                          >
                                            <XCircle className="w-3 h-3" />
                                            Fail
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() => handleUpdateScenario(scenario.id, { status: 'Blocked' })}
                                            className={`px-2 py-1 rounded-pill text-[10px] font-bold transition border flex items-center gap-1 ${
                                              scenario.status === 'Blocked'
                                                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                                                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                                            }`}
                                          >
                                            <AlertTriangle className="w-3 h-3" />
                                            Block
                                          </button>
                                        </div>

                                        {scenario.status !== 'Untested' && (
                                          <button
                                            type="button"
                                            onClick={() => handleUpdateScenario(scenario.id, { status: 'Untested' })}
                                            className="text-[10px] text-txt-muted hover:text-dark-chassis flex items-center gap-1 self-start pt-0.5"
                                          >
                                            <RotateCcw className="w-2.5 h-2.5" />
                                            Reset to Untested
                                          </button>
                                        )}
                                      </div>
                                    </td>

                                    {/* Observations & Notes (Live editable field with autosave) */}
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
                                            className="inline-flex items-center gap-1 text-[10px] text-indigo-600 hover:underline font-mono"
                                          >
                                            <ExternalLink className="w-2.5 h-2.5" /> Open Media
                                          </a>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-white rounded-2xl border border-clinical-border text-xs text-txt-muted">
                      No charter selected. Pick a charter tab from above to begin.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW 2: GUIDED STEPPER CARD MODE */}
            {viewMode === 'stepper' && currentStepperScenario && (
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-dark-chassis text-white text-xs font-mono font-bold">
                      {currentIndex + 1} / {filteredStepperRunnable.length}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-900 border border-indigo-300 text-xs font-bold">
                      {currentStepperScenario.featureName}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-qa-surface text-txt-secondary border border-qa-border text-xs font-mono">
                      {currentStepperScenario.charterCode}
                    </span>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border font-mono ${
                    currentStepperScenario.category === 'Golden Path'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : currentStepperScenario.category === 'Alternative Flow'
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : currentStepperScenario.category === 'Failure & Recovery'
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}>
                    {currentStepperScenario.category || 'Exploratory'}
                  </span>
                </div>

                {/* Scenario Mission Card */}
                <div className="p-6 rounded-3xl bg-qa-surface border-2 border-qa-border shadow-card space-y-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-txt-muted block mb-1">
                      Charter Mission:
                    </span>
                    <p className="text-xs text-txt-secondary font-medium italic">
                      &quot;{currentStepperScenario.charterMission}&quot;
                    </p>
                  </div>

                  <div className="pt-3 border-t border-qa-border">
                    <span className="text-[10px] font-mono font-bold text-indigo-700 uppercase tracking-wider block mb-1.5">
                      Exploration Prompt / Investigative Mission:
                    </span>
                    <p className="text-sm sm:text-base font-semibold text-dark-chassis leading-relaxed">
                      {currentStepperScenario.prompt_text}
                    </p>
                  </div>
                </div>

                {/* Observations & Evidence */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-dark-chassis block">
                      Observations &amp; Bug Notes
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Record what happened during exploration..."
                      value={activeNotes}
                      onChange={(e) => setActiveNotes(e.target.value)}
                      className="w-full p-3 bg-qa-white border border-qa-border rounded-2xl text-xs focus:outline-none focus:border-dark-chassis placeholder:text-txt-muted shadow-2xs resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-dark-chassis block">
                      Media / Screenshot Evidence URL
                    </label>
                    <input
                      type="text"
                      placeholder="Paste image URL or Loom link..."
                      value={activeMediaUrl}
                      onChange={(e) => setActiveMediaUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-qa-white border border-qa-border rounded-xl text-xs focus:outline-none focus:border-dark-chassis placeholder:text-txt-muted shadow-2xs"
                    />
                    <span className="text-[10px] text-txt-muted block pt-1">
                      Keyboard shortcuts: <kbd className="px-1.5 py-0.5 bg-qa-warm border rounded font-mono text-[10px]">P</kbd> Pass, <kbd className="px-1.5 py-0.5 bg-qa-warm border rounded font-mono text-[10px]">F</kbd> Fail, <kbd className="px-1.5 py-0.5 bg-qa-warm border rounded font-mono text-[10px]">B</kbd> Block, <kbd className="px-1.5 py-0.5 bg-qa-warm border rounded font-mono text-[10px]">→</kbd> Next
                    </span>
                  </div>
                </div>

                {/* Outcome Buttons */}
                <div className="pt-4 border-t border-qa-border flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentIndex === 0}
                      onClick={() => setCurrentIndex(prev => prev - 1)}
                      className="px-3.5 py-2 rounded-pill bg-qa-surface hover:bg-qa-warm text-dark-chassis text-xs font-bold border border-qa-border transition flex items-center gap-1 disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Previous</span>
                    </button>

                    <button
                      type="button"
                      disabled={currentIndex === filteredStepperRunnable.length - 1}
                      onClick={() => setCurrentIndex(prev => prev + 1)}
                      className="px-3.5 py-2 rounded-pill bg-qa-surface hover:bg-qa-warm text-dark-chassis text-xs font-bold border border-qa-border transition flex items-center gap-1 disabled:opacity-40"
                    >
                      <span>Skip / Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateScenario(currentStepperScenario.id, { 
                        status: 'Blocked', 
                        observations: activeNotes, 
                        media_url: activeMediaUrl 
                      }, true)}
                      className={`px-4 py-2 rounded-pill text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95 border ${
                        currentStepperScenario.status === 'Blocked'
                          ? 'bg-amber-500 text-white border-amber-600'
                          : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4" />
                      <span>Block (B)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateScenario(currentStepperScenario.id, { 
                        status: 'Fail', 
                        observations: activeNotes, 
                        media_url: activeMediaUrl 
                      }, true)}
                      className={`px-4 py-2 rounded-pill text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95 border ${
                        currentStepperScenario.status === 'Fail'
                          ? 'bg-rose-600 text-white border-rose-700'
                          : 'bg-rose-100 hover:bg-rose-200 text-rose-900 border-rose-300'
                      }`}
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Fail (F)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateScenario(currentStepperScenario.id, { 
                        status: 'Pass', 
                        observations: activeNotes, 
                        media_url: activeMediaUrl 
                      }, true)}
                      className={`px-5 py-2 rounded-pill text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95 border ${
                        currentStepperScenario.status === 'Pass'
                          ? 'bg-emerald-600 text-white border-emerald-700'
                          : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border-emerald-300'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Pass (P)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 3: RUN HISTORY & SAVED SESSIONS */}
            {viewMode === 'history' && (
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-dark-chassis">Test Run Sessions History</h3>
                    <p className="text-xs text-txt-muted">
                      Inspect completed runs, track pending runs, and re-download developer defect reports.
                    </p>
                  </div>

                  <button
                    onClick={persistRunSession}
                    className="px-3 py-1.5 rounded-pill bg-dark-chassis text-white text-xs font-semibold hover:bg-dark-secondary transition flex items-center gap-1.5"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Save Current Checkpoint</span>
                  </button>
                </div>

                {runSessions.length === 0 ? (
                  <div className="p-8 text-center bg-qa-surface rounded-2xl border border-qa-border text-xs text-txt-muted">
                    No past sessions saved yet. Run executions are automatically recorded here.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {runSessions.map((sess) => {
                      const passRate = sess.totalScenarios > 0 
                        ? Math.round((sess.passedCount / sess.totalScenarios) * 100) 
                        : 0;

                      return (
                        <div
                          key={sess.id}
                          className="p-4 rounded-2xl bg-white border border-qa-border shadow-xs flex flex-wrap items-center justify-between gap-4 hover:border-dark-chassis transition"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-dark-chassis">{sess.projectName}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                                sess.isCompleted 
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}>
                                {sess.isCompleted ? '✓ Completed' : 'Pending Run'}
                              </span>
                              <span className="text-[11px] text-txt-muted">
                                {new Date(sess.startTime).toLocaleString()}
                              </span>
                            </div>

                            <p className="text-[11px] text-txt-secondary">
                              Features: {sess.featureNames.join(', ') || 'All Features'}
                            </p>

                            <div className="flex items-center gap-2 text-[10px] font-mono pt-1">
                              <span className="text-emerald-700 font-bold">{sess.passedCount} Passed ({passRate}%)</span>
                              <span>•</span>
                              <span className="text-rose-700 font-bold">{sess.failedCount} Failed</span>
                              <span>•</span>
                              <span className="text-amber-700 font-bold">{sess.blockedCount} Blocked</span>
                              <span>•</span>
                              <span className="text-txt-muted">{sess.untestedCount} Untested</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleDownloadDefectPdf}
                              className="px-3 py-1.5 rounded-pill bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-1.5 transition"
                              title="Download PDF defect report for developers"
                            >
                              <FileDown className="w-3.5 h-3.5" />
                              <span>Defect PDF</span>
                            </button>

                            <button
                              onClick={() => setViewMode('charter')}
                              className="px-3.5 py-1.5 rounded-pill bg-dark-chassis hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Run</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
