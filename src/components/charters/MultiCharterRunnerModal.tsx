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
  Sliders, 
  ExternalLink,
  FileText,
  FileSpreadsheet,
  History,
  Eye,
  Clock,
  ChevronDown,
  FileDown,
  CheckCheck,
  RefreshCw,
  Trash2,
  Database,
  ArrowLeft,
  Settings2,
  Calendar,
  Sparkles
} from 'lucide-react';
import { Project, Feature, QACharter, CharterScenario, ScenarioStatus, QATestRun } from '@/lib/types';
import { supabase } from '@/lib/supabase/client';
import { 
  exportDefectReportPdf, 
  exportDefectReportMarkdown, 
  exportDefectReportCsv, 
  triggerFileDownload, 
  extractDefects,
  extractDefectsFromRunSnapshot,
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
  initialRun?: QATestRun | null;
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

export function MultiCharterRunnerModal({
  isOpen,
  onClose,
  currentProject,
  allProjects,
  allFeatures,
  currentFeature,
  onRefreshData,
  initialRun
}: MultiCharterRunnerModalProps) {
  // Phase: 'setup' (scope selection) or 'running' (active execution)
  const [phase, setPhase] = useState<'setup' | 'running'>('setup');

  // Setup tab: 'config' (New Run Setup) or 'history' (Run History in config page)
  const [setupTab, setSetupTab] = useState<'config' | 'history'>('config');

  // Selected Scope
  const [selectedProjectId, setSelectedProjectId] = useState<string>(currentProject?.id || '');
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<Set<string>>(new Set());
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
  const [isLoadingCharters, setIsLoadingCharters] = useState(false);

  // Custom Run Title & Environment state
  const [runTitleInput, setRunTitleInput] = useState<string>('');
  const [runEnvironmentInput, setRunEnvironmentInput] = useState<string>('');
  const [isUserEditedTitle, setIsUserEditedTitle] = useState<boolean>(false);
  const [activeRunName, setActiveRunName] = useState<string>('');
  const [activeRunSnapshot, setActiveRunSnapshot] = useState<Record<string, any> | null>(null);

  // Loaded Charters for the chosen scope
  const [loadedCharters, setLoadedCharters] = useState<QACharter[]>([]);
  const [runnableScenarios, setRunnableScenarios] = useState<RunnableScenario[]>([]);

  // Execution Views in Phase 2: 'charter' (default workspace-like view), 'stepper' (card mode), 'history' (run sessions)
  const [viewMode, setViewMode] = useState<'charter' | 'stepper' | 'history'>('charter');
  
  // Quick Filters for Completed vs Pending Charters
  const [runFilter, setRunFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [selectedCharterId, setSelectedCharterId] = useState<string>('');
  const [scenarioStatusFilter, setScenarioStatusFilter] = useState<string>('All');

  // Stepper execution state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeNotes, setActiveNotes] = useState('');
  const [activeMediaUrl, setActiveMediaUrl] = useState('');
  const [savingScenarioId, setSavingScenarioId] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Database-backed Test Runs (qa_test_runs table in PostgreSQL)
  const [dbTestRuns, setDbTestRuns] = useState<QATestRun[]>([]);
  const [activeDbRunId, setActiveDbRunId] = useState<string | null>(null);
  const [isLoadingRuns, setIsLoadingRuns] = useState(false);

  // Initialize selected project
  useEffect(() => {
    if (currentProject) {
      setSelectedProjectId(currentProject.id);
    } else if (allProjects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(allProjects[0].id);
    }
  }, [currentProject, allProjects]);

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

  // Auto-generate sensible default run title if user hasn't explicitly customized it
  useEffect(() => {
    if (!isUserEditedTitle && activeProject) {
      const featCount = selectedFeatureIds.size;
      const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      setRunTitleInput(`${activeProject.name} Run — ${featCount} Feature${featCount === 1 ? '' : 's'} (${dateStr})`);
    }
  }, [activeProject, selectedFeatureIds.size, isUserEditedTitle]);

  // Fetch test runs from Database (qa_test_runs)
  const loadDbTestRuns = useCallback(async () => {
    if (!selectedProjectId) return;
    setIsLoadingRuns(true);
    try {
      const res = await fetch(`/api/test-runs?projectId=${selectedProjectId}`);
      const data = await res.json();
      if (data.runs) {
        setDbTestRuns(data.runs);
      }
    } catch (err) {
      console.error('Error loading db test runs:', err);
    } finally {
      setIsLoadingRuns(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (isOpen && selectedProjectId) {
      loadDbTestRuns();
    }
  }, [isOpen, selectedProjectId, loadDbTestRuns]);

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

      const snapshot = activeRunSnapshot || {};
      const enrichedCharters: QACharter[] = (chartersData || []).map(c => ({
        ...c,
        scenarios: (scenariosByCharter[c.id] || []).map(s => {
          if (snapshot[s.id]) {
            return {
              ...s,
              status: snapshot[s.id].status || s.status,
              observations: snapshot[s.id].observations !== undefined ? snapshot[s.id].observations : s.observations,
              media_url: snapshot[s.id].media_url !== undefined ? snapshot[s.id].media_url : s.media_url
            };
          }
          return s;
        })
      }));

      setLoadedCharters(enrichedCharters);

      // Preserve active charter if already selected and valid; otherwise auto-select first pending or first charter
      setSelectedCharterId(current => {
        if (current && enrichedCharters.some(c => c.id === current)) {
          return current;
        }
        const pendingCharter = enrichedCharters.find(c => c.scenarios?.some(s => s.status === 'Untested'));
        return pendingCharter ? pendingCharter.id : (enrichedCharters[0]?.id || '');
      });

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
  }, [selectedFeatureIds, allFeatures, activeRunSnapshot]);

  // Resume an existing test run from DB without creating a duplicate run
  const handleResumeRun = useCallback((run: QATestRun) => {
    setActiveDbRunId(run.id);
    setActiveRunName(run.name);
    setRunTitleInput(run.name);
    setIsUserEditedTitle(true);
    if (run.metadata?.environment) {
      setRunEnvironmentInput(run.metadata.environment);
    }
    setSelectedProjectId(run.project_id);
    setSelectedFeatureIds(new Set(run.feature_ids || []));
    setActiveRunSnapshot(run.metadata?.scenario_results || {});
    setPhase('running');
    setViewMode('charter');
    setRunFilter('pending');
  }, []);

  // Automatically activate resume mode when initialRun is supplied
  useEffect(() => {
    if (isOpen && initialRun) {
      handleResumeRun(initialRun);
    }
  }, [isOpen, initialRun, handleResumeRun]);

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
    let list: QACharter[];
    if (runFilter === 'completed') list = [...charterRunStatus.completed];
    else if (runFilter === 'pending') list = [...charterRunStatus.pending];
    else list = [...loadedCharters];

    // Ensure the currently active charter stays visible in the tab bar even if it just completed
    if (selectedCharterId && !list.some(c => c.id === selectedCharterId)) {
      const activeC = loadedCharters.find(c => c.id === selectedCharterId);
      if (activeC) {
        list = [activeC, ...list];
      }
    }
    return list;
  }, [loadedCharters, charterRunStatus, runFilter, selectedCharterId]);

  // Initialize selectedCharterId once charters are available if none is selected
  useEffect(() => {
    if (!selectedCharterId && visibleCharters.length > 0) {
      setSelectedCharterId(visibleCharters[0].id);
    }
  }, [visibleCharters, selectedCharterId]);

  const activeCharter = useMemo(() => {
    return loadedCharters.find(c => c.id === selectedCharterId) || loadedCharters[0];
  }, [loadedCharters, selectedCharterId]);

  const currentCharterIndex = useMemo(() => {
    return loadedCharters.findIndex(c => c.id === activeCharter?.id);
  }, [loadedCharters, activeCharter]);

  const prevCharter = useMemo(() => {
    if (currentCharterIndex > 0) return loadedCharters[currentCharterIndex - 1];
    return null;
  }, [loadedCharters, currentCharterIndex]);

  const nextCharter = useMemo(() => {
    if (currentCharterIndex >= 0 && currentCharterIndex < loadedCharters.length - 1) {
      return loadedCharters[currentCharterIndex + 1];
    }
    return null;
  }, [loadedCharters, currentCharterIndex]);

  const isCurrentCharterDone = useMemo(() => {
    if (!activeCharter?.scenarios || activeCharter.scenarios.length === 0) return false;
    return !activeCharter.scenarios.some(s => s.status === 'Untested');
  }, [activeCharter]);

  const handleGoToNextCharter = () => {
    if (nextCharter) {
      setSelectedCharterId(nextCharter.id);
    }
  };

  const handleGoToPrevCharter = () => {
    if (prevCharter) {
      setSelectedCharterId(prevCharter.id);
    }
  };

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

  // Start execution run and create a record in qa_test_runs table
  const handleStartExecutionRun = async () => {
    setCurrentIndex(0);
    setPhase('running');
    setViewMode('charter');

    if (!selectedProjectId) return;

    // If already attached to an active DB run (e.g. from resume), do not create duplicate!
    if (activeDbRunId) {
      return;
    }

    try {
      const featNames = projectFeatures
        .filter(f => selectedFeatureIds.has(f.id))
        .map(f => f.name);

      const title = runTitleInput.trim() || `${activeProject?.name || 'QA'} Run (${new Date().toLocaleDateString()})`;

      const res = await fetch('/api/test-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: selectedProjectId,
          name: title,
          feature_ids: Array.from(selectedFeatureIds),
          total_scenarios: runnableScenarios.length,
          metadata: {
            featureNames: featNames,
            platform: activeProject?.platform,
            environment: runEnvironmentInput.trim() || undefined,
            scenario_results: {}
          }
        })
      });

      const data = await res.json();
      if (data.run?.id) {
        setActiveDbRunId(data.run.id);
        setActiveRunName(data.run.name);
        setActiveRunSnapshot({});
        setDbTestRuns(prev => [data.run, ...prev]);
      }
    } catch (err) {
      console.error('Error creating database test run:', err);
    }
  };

  // Sync test run progress in Database (qa_test_runs)
  const syncDbRunProgress = async (
    runId: string,
    passed: number,
    failed: number,
    blocked: number,
    untested: number,
    total: number,
    scenarioResultUpdate?: Record<string, any>
  ) => {
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    const isDone = total > 0 && untested === 0;

    try {
      const payload: Record<string, any> = {
        id: runId,
        passed_count: passed,
        failed_count: failed,
        blocked_count: blocked,
        untested_count: untested,
        pass_rate: passRate,
        status: isDone ? 'completed' : 'in_progress',
        completed_at: isDone ? new Date().toISOString() : null
      };

      if (scenarioResultUpdate) {
        payload.metadata = {
          scenario_results: scenarioResultUpdate
        };
      }

      await fetch('/api/test-runs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Update local dbTestRuns state
      setDbTestRuns(prev => prev.map(r => {
        if (r.id !== runId) return r;
        const existingMeta = r.metadata || {};
        const mergedResults = {
          ...(existingMeta.scenario_results || {}),
          ...(scenarioResultUpdate || {})
        };
        return {
          ...r,
          passed_count: passed,
          failed_count: failed,
          blocked_count: blocked,
          untested_count: untested,
          pass_rate: passRate,
          status: isDone ? 'completed' : 'in_progress',
          completed_at: isDone ? new Date().toISOString() : r.completed_at,
          updated_at: new Date().toISOString(),
          metadata: {
            ...existingMeta,
            scenario_results: mergedResults
          }
        };
      }));
    } catch (err) {
      console.error('Failed syncing test run progress to DB:', err);
    }
  };

  // Delete a test run from database
  const handleDeleteDbRun = async (runId: string) => {
    if (!confirm('Are you sure you want to delete this test run record from the database?')) return;
    try {
      await fetch(`/api/test-runs?id=${runId}`, { method: 'DELETE' });
      setDbTestRuns(prev => prev.filter(r => r.id !== runId));
      if (activeDbRunId === runId) {
        setActiveDbRunId(null);
        setActiveRunName('');
        setActiveRunSnapshot(null);
      }
    } catch (err) {
      console.error('Error deleting test run:', err);
    }
  };

  // Update individual scenario (persisted in qa_charter_scenarios and synced to qa_test_runs)
  const handleUpdateScenario = async (
    scenarioId: string,
    updates: Partial<CharterScenario>,
    advanceStepper = false
  ) => {
    setSavingScenarioId(scenarioId);

    // 1. Optimistic update in runnableScenarios
    const updatedRunnable = runnableScenarios.map(s => s.id === scenarioId ? { ...s, ...updates } : s);
    setRunnableScenarios(updatedRunnable);

    // 2. Optimistic update in loadedCharters
    setLoadedCharters(prev => prev.map(c => {
      if (!c.scenarios?.some(s => s.id === scenarioId)) return c;
      return {
        ...c,
        scenarios: c.scenarios.map(s => s.id === scenarioId ? { ...s, ...updates } : s)
      };
    }));

    // Calculate updated metrics
    let newPassed = 0;
    let newFailed = 0;
    let newBlocked = 0;
    let newUntested = 0;
    updatedRunnable.forEach(s => {
      if (s.status === 'Pass') newPassed++;
      else if (s.status === 'Fail') newFailed++;
      else if (s.status === 'Blocked') newBlocked++;
      else newUntested++;
    });

    try {
      // 1. Save scenario in PostgreSQL (qa_charter_scenarios)
      await fetch('/api/charters', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'scenario',
          scenario_id: scenarioId,
          ...updates
        })
      });

      // 2. Sync run progress & scenario snapshot to PostgreSQL (qa_test_runs)
      if (activeDbRunId) {
        const scenarioUpdate = {
          status: updates.status || 'Untested',
          observations: updates.observations,
          media_url: updates.media_url,
          executed_at: new Date().toISOString()
        };

        setActiveRunSnapshot(prev => ({
          ...(prev || {}),
          [scenarioId]: scenarioUpdate
        }));

        syncDbRunProgress(
          activeDbRunId, 
          newPassed, 
          newFailed, 
          newBlocked, 
          newUntested, 
          updatedRunnable.length,
          { [scenarioId]: scenarioUpdate }
        );
      }
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
  const getDefectReportMetadata = (customRun?: QATestRun): DefectReportMetadata => {
    const featMap = new Map(allFeatures.map(f => [f.id, f.name]));
    const featureNames = customRun?.metadata?.featureNames || 
      Array.from(selectedFeatureIds).map(id => featMap.get(id) || 'Feature');

    return {
      projectName: activeProject?.name || 'QA Test Studio',
      runName: customRun ? customRun.name : (activeRunName || runTitleInput || undefined),
      platform: activeProject?.platform || 'General',
      featureNames,
      totalScenarios: customRun ? customRun.total_scenarios : counters.total,
      passedCount: customRun ? customRun.passed_count : counters.passed,
      failedCount: customRun ? customRun.failed_count : counters.failed,
      blockedCount: customRun ? customRun.blocked_count : counters.blocked,
      untestedCount: customRun ? customRun.untested_count : counters.untested,
      passRate: customRun ? customRun.pass_rate : counters.percent,
      environment: customRun?.metadata?.environment || runEnvironmentInput || undefined,
      generatedDate: customRun 
        ? new Date(customRun.started_at || customRun.created_at).toLocaleDateString()
        : new Date().toLocaleDateString()
    };
  };

  // Export PDF Defect Report
  const handleDownloadDefectPdf = (customRun?: QATestRun | React.MouseEvent | unknown) => {
    const run = (customRun && typeof customRun === 'object' && 'id' in customRun && !('nativeEvent' in customRun)) 
      ? (customRun as QATestRun) 
      : undefined;
    const meta = getDefectReportMetadata(run);
    const featMap = new Map(allFeatures.map(f => [f.id, f.name]));
    const defects = run
      ? extractDefectsFromRunSnapshot(run, loadedCharters, featMap)
      : extractDefects(loadedCharters, featMap);
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

  if (!isOpen) return null;

  return (
    /* Full-Page Test Run Studio (100vw x 100vh edge-to-edge) */
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 text-txt-primary animate-in fade-in duration-150 overflow-hidden w-screen h-screen">
      
      {/* Studio Top Header Bar */}
      <header className="bg-dark-chassis text-white px-3.5 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-3 border-b border-dark-secondary shrink-0 shadow-md">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={() => {
              if (onRefreshData) onRefreshData();
              onClose();
            }}
            className="px-2 sm:px-3 py-1.5 rounded-pill bg-dark-secondary hover:bg-dark-tertiary text-txt-muted hover:text-white flex items-center gap-1 sm:gap-1.5 text-xs font-semibold transition border border-dark-tertiary shadow-2xs shrink-0"
            title="Exit Full-Page Studio back to workspace"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back to Workspace</span>
            <span className="sm:hidden">Back</span>
          </button>

          <div className="h-5 w-px bg-dark-secondary hidden sm:block shrink-0" />

          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-neon text-dark-chassis flex items-center justify-center font-bold text-xs shadow-sm shrink-0">
              <Play className="w-3 sm:w-3.5 h-3 sm:h-3.5 fill-dark-chassis" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-xs sm:text-sm font-bold tracking-tight text-white truncate max-w-[130px] xs:max-w-[200px] sm:max-w-md">
                  {phase === 'setup' ? 'Test Run Setup' : (activeRunName || runTitleInput || `Test Run Studio: ${activeProject?.name || 'QA App'}`)}
                </h1>
                {activeDbRunId && phase === 'running' && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 shrink-0">
                    ● DB Synced
                  </span>
                )}
                <span className="hidden md:inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-dark-secondary text-neon border border-dark-tertiary shrink-0">
                  {phase === 'setup' ? 'SCOPE' : 'STUDIO'}
                </span>
                {counters.isCompleted && phase === 'running' && (
                  <span className="hidden xs:flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 items-center gap-1 shrink-0">
                    <CheckCheck className="w-3 h-3" />
                    100%
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-txt-muted truncate hidden sm:block">
                {phase === 'setup'
                  ? 'Configure applications and feature charters to bundle into this test cycle'
                  : `${activeProject?.name || 'App'} • ${selectedFeatureIds.size} feature${selectedFeatureIds.size === 1 ? '' : 's'} (${counters.total} scenarios)${runEnvironmentInput ? ` • Env: ${runEnvironmentInput}` : ''}`}
              </p>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {phase === 'running' && (
            <>
              {/* Defect Report Export Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="px-2.5 sm:px-3 py-1.5 rounded-pill text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition flex items-center gap-1.5 shadow-sm active:scale-95"
                  title="Export failure defect report for developers"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Defect Report</span>
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
                  </div>
                )}
              </div>

              {/* Scope Switcher */}
              <button
                onClick={() => setPhase('setup')}
                className="px-2.5 sm:px-3 py-1.5 rounded-pill text-xs font-semibold bg-dark-secondary hover:bg-dark-tertiary text-white transition flex items-center gap-1.5 border border-dark-tertiary"
                title="Change Test Scope"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Change Scope</span>
              </button>
            </>
          )}

          <button
            onClick={() => {
              if (onRefreshData) onRefreshData();
              onClose();
            }}
            className="w-7 h-7 rounded-full bg-dark-secondary hover:bg-dark-tertiary text-txt-muted hover:text-white flex items-center justify-center transition border border-dark-tertiary"
            title="Exit Full-Page Studio"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* PHASE 1: TEST RUN SETUP & CONFIGURATION PAGE */}
      {phase === 'setup' && (
        <div className="flex-1 flex flex-col overflow-hidden bg-qa-bg">
          
          {/* Sub-Header Tabs: New Run Setup vs Run History */}
          <div className="px-6 py-3 bg-white border-b border-qa-border flex items-center justify-between gap-4 shrink-0 shadow-2xs">
            <div className="flex items-center gap-2 bg-qa-warm p-1 rounded-pill border border-qa-border">
              <button
                onClick={() => setSetupTab('config')}
                className={`px-4 py-1.5 rounded-pill text-xs font-bold transition flex items-center gap-2 ${
                  setupTab === 'config'
                    ? 'bg-dark-chassis text-white shadow-2xs'
                    : 'text-txt-muted hover:text-dark-chassis'
                }`}
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>Configure New Run</span>
              </button>

              <button
                onClick={() => {
                  setSetupTab('history');
                  loadDbTestRuns();
                }}
                className={`px-4 py-1.5 rounded-pill text-xs font-bold transition flex items-center gap-2 ${
                  setupTab === 'history'
                    ? 'bg-dark-chassis text-white shadow-2xs'
                    : 'text-txt-muted hover:text-dark-chassis'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Run History ({dbTestRuns.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-txt-muted hidden md:inline">
                Target App: <strong className="text-dark-chassis">{activeProject?.name || 'All'}</strong>
              </span>
            </div>
          </div>

          {/* TAB 1: CONFIGURE NEW RUN */}
          {setupTab === 'config' && (
            <div className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1 max-w-6xl w-full mx-auto">
              
              {/* Test Run Title & Cycle Configuration */}
              <div className="p-5 rounded-2xl bg-white border border-qa-border shadow-2xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-dark-chassis uppercase tracking-wider">
                      Test Run Title & Cycle Configuration
                    </span>
                  </div>
                  {activeDbRunId && (
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-bold flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 text-amber-700" />
                        Resuming: {activeRunName}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveDbRunId(null);
                          setActiveRunSnapshot(null);
                          setActiveRunName('');
                          setIsUserEditedTitle(false);
                        }}
                        className="text-[10px] text-txt-muted hover:text-rose-600 underline font-semibold transition"
                      >
                        Start Fresh Run Instead
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[11px] font-bold text-dark-chassis block">
                      Test Run Title / Cycle Name
                    </label>
                    <input
                      type="text"
                      value={runTitleInput}
                      onChange={(e) => {
                        setRunTitleInput(e.target.value);
                        setIsUserEditedTitle(true);
                      }}
                      placeholder="e.g. Release 2.4 - Checkout & KYC Regression"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-qa-border text-xs text-dark-chassis focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition"
                    />
                    <span className="text-[10px] text-txt-muted block">
                      Custom name saved to database and displayed on defect reports & team summaries.
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-dark-chassis block">
                      Environment / Target (optional)
                    </label>
                    <input
                      type="text"
                      value={runEnvironmentInput}
                      onChange={(e) => setRunEnvironmentInput(e.target.value)}
                      placeholder="e.g. Staging / iOS 17.4"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-qa-border text-xs text-dark-chassis focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition"
                    />
                    <span className="text-[10px] text-txt-muted block">
                      Build target, sprint number, or tester name.
                    </span>
                  </div>
                </div>
              </div>

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
                        className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between space-y-2 ${
                          isSelected 
                            ? 'bg-dark-chassis text-white border-dark-chassis shadow-card' 
                            : 'bg-white text-txt-primary border-qa-border hover:bg-qa-warm'
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
                      className="px-3 py-1 rounded-pill text-[11px] font-semibold bg-white hover:bg-qa-warm text-dark-chassis border border-qa-border transition"
                    >
                      Select All ({projectFeatures.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedFeatureIds(new Set())}
                      className="px-3 py-1 rounded-pill text-[11px] font-semibold bg-white hover:bg-qa-warm text-txt-muted border border-qa-border transition"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                {projectFeatures.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-2xl border border-qa-border text-xs text-txt-secondary">
                    No features found in this application yet. Create a feature flow first to generate charters.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {projectFeatures.map(feat => {
                      const isChecked = selectedFeatureIds.has(feat.id);
                      return (
                        <label
                          key={feat.id}
                          className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition ${
                            isChecked 
                              ? 'bg-indigo-50/70 border-indigo-300 shadow-2xs' 
                              : 'bg-white border-qa-border hover:bg-qa-warm'
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
              <div className="p-5 rounded-2xl bg-dark-chassis text-white flex flex-wrap items-center justify-between gap-4 shadow-md">
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
                    {activeDbRunId 
                      ? `Resuming: "${activeRunName || runTitleInput}" • Continuing from where you left off`
                      : '360° coverage: Golden Path, Alternative Flows, Boundary checks, and Failure/Recovery'}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isLoadingCharters || runnableScenarios.length === 0}
                  onClick={handleStartExecutionRun}
                  className="px-6 py-2.5 rounded-pill bg-neon hover:bg-neon-bright text-dark-chassis text-xs font-bold transition shadow-card flex items-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-dark-chassis" />
                  <span>{activeDbRunId ? 'Continue Run Studio' : 'Launch Full-Page Test Run'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: RUN HISTORY ON CONFIG PAGE */}
          {setupTab === 'history' && (
            <div className="p-6 md:p-8 space-y-4 overflow-y-auto flex-1 max-w-6xl w-full mx-auto">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-dark-chassis">Test Run History</h3>
                  <p className="text-xs text-txt-muted">
                    Inspect past runs, check pass rates, and resume in-progress runs or download defect reports.
                  </p>
                </div>

                <button
                  onClick={loadDbTestRuns}
                  disabled={isLoadingRuns}
                  className="px-3.5 py-1.5 rounded-pill bg-dark-chassis text-white text-xs font-semibold hover:bg-dark-secondary transition flex items-center gap-1.5 shadow-2xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRuns ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {isLoadingRuns && dbTestRuns.length === 0 ? (
                <div className="p-12 text-center text-xs text-txt-muted bg-white rounded-2xl border border-qa-border">
                  Loading test run history...
                </div>
              ) : dbTestRuns.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-qa-border text-xs text-txt-muted">
                  No previous runs recorded for this application yet. Launch a new run above to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {dbTestRuns.map((run) => {
                    const isCompleted = run.status === 'completed';
                    const featureNames = run.metadata?.featureNames || [];

                    return (
                      <div
                        key={run.id}
                        className="p-4 rounded-2xl bg-white border border-qa-border shadow-xs flex flex-wrap items-center justify-between gap-4 hover:border-dark-chassis transition"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-dark-chassis">{run.name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                              isCompleted 
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}>
                              {isCompleted ? '✓ Completed' : 'In Progress'}
                            </span>
                            <span className="text-[11px] text-txt-muted">
                              {new Date(run.started_at || run.created_at).toLocaleString()}
                            </span>
                          </div>

                          {featureNames.length > 0 && (
                            <p className="text-[11px] text-txt-secondary">
                              Features: {featureNames.join(', ')}
                            </p>
                          )}

                          <div className="flex items-center gap-2 text-[10px] font-mono pt-1">
                            <span className="text-emerald-700 font-bold">{run.passed_count} Passed ({run.pass_rate}%)</span>
                            <span>•</span>
                            <span className="text-rose-700 font-bold">{run.failed_count} Failed</span>
                            <span>•</span>
                            <span className="text-amber-700 font-bold">{run.blocked_count} Blocked</span>
                            <span>•</span>
                            <span className="text-txt-muted">{run.untested_count} Untested</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDownloadDefectPdf(run)}
                            className="px-3 py-1.5 rounded-pill bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-1.5 transition"
                            title="Download PDF defect report for this test run"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                            <span>Defect PDF</span>
                          </button>

                          <button
                            onClick={() => handleResumeRun(run)}
                            className="px-3.5 py-1.5 rounded-pill bg-dark-chassis hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs active:scale-95"
                          >
                            <Play className="w-3.5 h-3.5 text-neon fill-neon" />
                            <span>{isCompleted ? 'View Run' : 'Resume Run'}</span>
                          </button>

                          <button
                            onClick={() => handleDeleteDbRun(run.id)}
                            className="p-1.5 rounded-full hover:bg-rose-50 text-txt-muted hover:text-rose-600 transition"
                            title="Delete test run record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* PHASE 2: FULL-PAGE ACTIVE EXECUTION STUDIO */}
      {phase === 'running' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* Studio Metrics & View Switcher Bar */}
          <div className="bg-qa-white px-3.5 sm:px-6 py-2.5 sm:py-3 border-b border-qa-border flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-4 shrink-0 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-dark-chassis">
                    Progress: {counters.executed} of {counters.total}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-indigo-700">
                    ({counters.percent}%)
                  </span>
                </div>
                {/* Multi-color Progress Bar */}
                <div className="w-full sm:w-64 h-2 bg-qa-border rounded-full overflow-hidden flex">
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

              {/* Counters Badges */}
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono overflow-x-auto no-scrollbar pb-0.5 sm:pb-0">
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold border border-emerald-300 shrink-0">
                  PASS: {counters.passed}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold border border-rose-300 shrink-0">
                  FAIL: {counters.failed}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold border border-amber-300 shrink-0">
                  BLOCK: {counters.blocked}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-qa-surface text-slate-700 font-medium border border-qa-border shrink-0">
                  LEFT: {counters.untested}
                </span>
              </div>
            </div>

            {/* View Switcher: Charter View vs Guided Stepper vs Run History */}
            <div className="flex items-center gap-1 bg-qa-warm p-1 rounded-pill border border-qa-border self-start md:self-auto overflow-x-auto no-scrollbar max-w-full">
              <button
                onClick={() => setViewMode('charter')}
                className={`px-3 sm:px-3.5 py-1 rounded-pill text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${
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
                className={`px-3 sm:px-3.5 py-1 rounded-pill text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${
                  viewMode === 'stepper'
                    ? 'bg-dark-chassis text-white shadow-2xs'
                    : 'text-txt-muted hover:text-dark-chassis'
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                <span>Guided Stepper</span>
              </button>

              <button
                onClick={() => {
                  setViewMode('history');
                  loadDbTestRuns();
                }}
                className={`px-3 sm:px-3.5 py-1 rounded-pill text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${
                  viewMode === 'history'
                    ? 'bg-dark-chassis text-white shadow-2xs'
                    : 'text-txt-muted hover:text-dark-chassis'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>History ({dbTestRuns.length})</span>
              </button>
            </div>
          </div>

          {/* VIEW 1: CHARTER-CENTRIC VIEW (MATCHING WORKSPACE CHARTERS VIEW) */}
          {viewMode === 'charter' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              
              {/* Secondary Sub-Bar: Quick Filter for Completed / Pending Charters + Status Badges */}
              <div className="px-3.5 sm:px-6 py-2 sm:py-2.5 bg-clinical-warm/80 border-b border-clinical-border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
                {/* Filter: All vs Pending Runs vs Completed Runs */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-full border border-clinical-border shadow-2xs text-xs overflow-x-auto no-scrollbar max-w-full pb-0.5 sm:pb-0">
                  <span className="text-[10px] font-mono text-txt-muted px-2 uppercase font-bold shrink-0">Filter:</span>
                  <button
                    onClick={() => setRunFilter('all')}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition shrink-0 ${
                      runFilter === 'all'
                        ? 'bg-dark-chassis text-white shadow-xs'
                        : 'text-txt-secondary hover:text-dark-chassis'
                    }`}
                  >
                    All ({loadedCharters.length})
                  </button>
                  <button
                    onClick={() => setRunFilter('pending')}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition flex items-center gap-1 shrink-0 ${
                      runFilter === 'pending'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-amber-800 hover:bg-amber-50'
                    }`}
                  >
                    <span>Pending ({charterRunStatus.pending.length})</span>
                  </button>
                  <button
                    onClick={() => setRunFilter('completed')}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition flex items-center gap-1 shrink-0 ${
                      runFilter === 'completed'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-emerald-800 hover:bg-emerald-50'
                    }`}
                  >
                    <span>Done ({charterRunStatus.completed.length})</span>
                  </button>
                </div>

                {/* Scenario Status Filter */}
                <div className="flex items-center gap-1 text-xs overflow-x-auto no-scrollbar max-w-full">
                  <span className="text-[11px] text-txt-muted font-medium mr-1 shrink-0">Status:</span>
                  {(['All', 'Pass', 'Fail', 'Blocked', 'Untested'] as const).map(st => {
                    const isActive = scenarioStatusFilter === st;
                    return (
                      <button
                        key={st}
                        onClick={() => setScenarioStatusFilter(st)}
                        className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition shrink-0 ${
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
              <div className="px-3.5 sm:px-6 py-2 bg-white border-b border-clinical-border flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 touch-pan-x">
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
                        className={`px-3 py-1.5 rounded-pill text-xs font-medium flex items-center gap-2 whitespace-nowrap transition border shrink-0 ${
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

              {/* Active Charter Workspace Body (Full-Width Studio Table) */}
              <div className="flex-1 p-3.5 sm:p-6 md:p-8 overflow-y-auto space-y-4">
                {activeCharter ? (
                  <div className="bg-white rounded-[22px] border border-clinical-border shadow-xs overflow-hidden">
                    
                    {/* Charter Context Header: 4 Pillars & 360° coverage */}
                    <div className="p-4 sm:p-5 border-b border-clinical-border bg-gradient-to-r from-slate-50/90 to-white">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
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

                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          {/* Mini Previous / Next Charter Controls */}
                          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-clinical-border shadow-2xs">
                            <button
                              type="button"
                              disabled={!prevCharter}
                              onClick={handleGoToPrevCharter}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-dark-chassis disabled:opacity-30 disabled:hover:bg-transparent transition"
                              title={prevCharter ? `Previous: ${prevCharter.charter_code}` : 'First charter'}
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-[10px] font-mono font-bold text-txt-muted px-1.5">
                              {currentCharterIndex + 1} / {loadedCharters.length}
                            </span>
                            <button
                              type="button"
                              disabled={!nextCharter}
                              onClick={handleGoToNextCharter}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-dark-chassis disabled:opacity-30 disabled:hover:bg-transparent transition"
                              title={nextCharter ? `Next: ${nextCharter.charter_code}` : 'Last charter'}
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-neon/20 text-dark-chassis border border-neon/30">
                            {activeCharter.status || 'ACTIVE_RUN'}
                          </span>
                        </div>
                      </div>

                      {/* 4 Core Mission Pillars */}
                      <div className="space-y-2 sm:space-y-1.5 text-xs">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-2">
                          <span className="font-bold text-dark-chassis shrink-0 sm:w-32 text-[11px] sm:text-xs">Mission:</span>
                          <span className="text-dark-secondary leading-relaxed">{activeCharter.mission}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-2">
                          <span className="font-bold text-dark-chassis shrink-0 sm:w-32 text-[11px] sm:text-xs">User Persona:</span>
                          <span className="text-dark-secondary leading-relaxed">{activeCharter.user_persona}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-2">
                          <span className="font-bold text-dark-chassis shrink-0 sm:w-32 text-[11px] sm:text-xs">Starting Condition:</span>
                          <span className="text-dark-secondary leading-relaxed">{activeCharter.starting_condition}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-2">
                          <span className="font-bold text-dark-chassis shrink-0 sm:w-32 text-[11px] sm:text-xs">Expected Outcome:</span>
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

                    {/* Desktop Scenario Table (hidden on mobile/tablet < lg) */}
                    <div className="hidden lg:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#1E293B] text-white text-[11px] font-bold tracking-wider uppercase border-b border-slate-700">
                            <th className="py-3 px-4 w-24 shrink-0 font-mono">Prompt ID</th>
                            <th className="py-3 px-4 min-w-[320px]">Exploration Prompts &amp; Investigative Scenarios</th>
                            <th className="py-3 px-4 w-44">Status &amp; Quick Action</th>
                            <th className="py-3 px-4 min-w-[280px]">Observations &amp; Notes</th>
                            <th className="py-3 px-4 w-40">Media URL</th>
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

                                  {/* Observations & Notes */}
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

                    {/* Mobile Scenario Card View (< lg screens) */}
                    <div className="block lg:hidden divide-y divide-clinical-border">
                      {activeCharterScenarios.length === 0 ? (
                        <div className="py-8 text-center text-txt-muted italic text-xs">
                          No scenarios matching filter &quot;{scenarioStatusFilter}&quot;.
                        </div>
                      ) : (
                        activeCharterScenarios.map((scenario) => {
                          return (
                            <div key={scenario.id} className="p-3.5 sm:p-4 bg-white hover:bg-slate-50/50 space-y-3">
                              {/* Card Header: Prompt ID + Category */}
                              <div className="flex flex-wrap items-center justify-between gap-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-xs text-dark-chassis px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                                    {scenario.prompt_id}
                                  </span>
                                  {scenario.category && (
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
                                  )}
                                </div>

                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
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
                              </div>

                              {/* Exploration Prompt Text */}
                              <div className="text-xs sm:text-sm font-medium text-dark-chassis leading-relaxed">
                                {scenario.prompt_text}
                              </div>

                              {/* Traceability Details */}
                              {scenario.traceability && (
                                <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
                                  <div className="flex flex-wrap items-center gap-1">
                                    {scenario.traceability.exploration_dimensions?.map((dim, dIdx) => (
                                      <span key={dIdx} className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                        {dim}
                                      </span>
                                    ))}
                                  </div>
                                  {scenario.traceability.derived_from && (
                                    <details className="text-[10px] text-txt-muted group/trace">
                                      <summary className="cursor-pointer hover:text-dark-chassis font-medium inline-flex items-center gap-1 text-[10px] py-0.5">
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

                              {/* 1-Click Thumb-Friendly Quick Action Buttons (Min 44px height) */}
                              <div className="pt-2 border-t border-slate-100 space-y-2">
                                <div className="text-[11px] font-semibold text-txt-muted">Execute Outcome:</div>
                                <div className="grid grid-cols-3 gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateScenario(scenario.id, { status: 'Pass' })}
                                    className={`min-h-[44px] py-2 px-2 rounded-xl text-xs font-bold transition border flex items-center justify-center gap-1.5 active:scale-95 ${
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
                                    className={`min-h-[44px] py-2 px-2 rounded-xl text-xs font-bold transition border flex items-center justify-center gap-1.5 active:scale-95 ${
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
                                    className={`min-h-[44px] py-2 px-2 rounded-xl text-xs font-bold transition border flex items-center justify-center gap-1.5 active:scale-95 ${
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
                                    className="text-xs text-txt-muted hover:text-dark-chassis flex items-center gap-1.5 py-1"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Reset to Untested</span>
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
                                    placeholder="Record observations or bug details..."
                                    onBlur={(e) => {
                                      if (e.target.value !== scenario.observations) {
                                        handleUpdateScenario(scenario.id, { observations: e.target.value });
                                      }
                                    }}
                                    rows={2}
                                    className="w-full text-xs p-2.5 rounded-xl border border-clinical-border bg-white text-dark-chassis placeholder:text-txt-muted/70 focus:outline-none focus:border-dark-chassis transition resize-y leading-relaxed font-sans"
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
                                      className="flex-1 text-xs p-2 rounded-xl border border-clinical-border bg-white text-dark-secondary placeholder:text-txt-muted/60 focus:outline-none focus:border-dark-chassis font-mono"
                                    />
                                    {scenario.media_url && (
                                      <a
                                        href={scenario.media_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="shrink-0 min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-indigo-700 text-xs font-semibold flex items-center gap-1"
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

                    {/* Bottom Charter Navigation & Completion Banner */}
                    <div className="p-4 sm:px-6 sm:py-4 bg-slate-50 border-t border-clinical-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <button
                        type="button"
                        disabled={!prevCharter}
                        onClick={handleGoToPrevCharter}
                        className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-pill bg-white hover:bg-slate-100 text-dark-chassis border border-clinical-border text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs"
                      >
                        <ChevronLeft className="w-4 h-4 shrink-0" />
                        <span className="truncate">Previous Charter{prevCharter ? `: ${prevCharter.charter_code}` : ''}</span>
                      </button>

                      <div className="flex items-center justify-center gap-2 py-0.5">
                        <span className="text-xs text-txt-muted font-medium">
                          Charter {currentCharterIndex + 1} of {loadedCharters.length}
                        </span>
                        {isCurrentCharterDone ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Complete</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200">
                            {activeCharter.scenarios?.filter(s => s.status === 'Untested').length} Left
                          </span>
                        )}
                      </div>

                      {nextCharter ? (
                        <button
                          type="button"
                          onClick={handleGoToNextCharter}
                          className={`w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-pill text-xs font-bold flex items-center justify-center gap-2 transition shadow-card active:scale-95 ${
                            isCurrentCharterDone
                              ? 'bg-neon hover:bg-neon-bright text-dark-chassis ring-2 ring-neon/50'
                              : 'bg-dark-chassis hover:bg-black text-white'
                          }`}
                        >
                          <span className="truncate">{isCurrentCharterDone ? 'Proceed to Next' : 'Next'}: {nextCharter.charter_code}</span>
                          <ChevronRight className="w-4 h-4 shrink-0" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setViewMode('history')}
                          className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-pill bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-card active:scale-95"
                        >
                          <CheckCheck className="w-4 h-4 shrink-0" />
                          <span>Finish Run &amp; View Summary</span>
                        </button>
                      )}
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
            <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-6 max-w-5xl w-full mx-auto">
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
              <div className="p-6 rounded-3xl bg-qa-white border-2 border-qa-border shadow-card space-y-4">
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
              <div className="pt-4 border-t border-qa-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center justify-between sm:justify-start gap-2">
                  <button
                    type="button"
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex(prev => prev - 1)}
                    className="min-h-[44px] flex-1 sm:flex-none px-3.5 py-2 rounded-pill bg-qa-white hover:bg-qa-warm text-dark-chassis text-xs font-bold border border-qa-border transition flex items-center justify-center gap-1 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4 shrink-0" />
                    <span>Previous</span>
                  </button>

                  <button
                    type="button"
                    disabled={currentIndex === filteredStepperRunnable.length - 1}
                    onClick={() => setCurrentIndex(prev => prev + 1)}
                    className="min-h-[44px] flex-1 sm:flex-none px-3.5 py-2 rounded-pill bg-qa-white hover:bg-qa-warm text-dark-chassis text-xs font-bold border border-qa-border transition flex items-center justify-center gap-1 disabled:opacity-40"
                  >
                    <span>Skip / Next</span>
                    <ChevronRight className="w-4 h-4 shrink-0" />
                  </button>
                </div>

                <div className="grid grid-cols-3 sm:flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateScenario(currentStepperScenario.id, { 
                      status: 'Blocked', 
                      observations: activeNotes, 
                      media_url: activeMediaUrl 
                    }, true)}
                    className={`min-h-[44px] px-3 sm:px-4 py-2 rounded-pill text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95 border ${
                      currentStepperScenario.status === 'Blocked'
                        ? 'bg-amber-500 text-white border-amber-600'
                        : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline">Block (B)</span>
                    <span className="sm:hidden">Block</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdateScenario(currentStepperScenario.id, { 
                      status: 'Fail', 
                      observations: activeNotes, 
                      media_url: activeMediaUrl 
                    }, true)}
                    className={`min-h-[44px] px-3 sm:px-4 py-2 rounded-pill text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95 border ${
                      currentStepperScenario.status === 'Fail'
                        ? 'bg-rose-600 text-white border-rose-700'
                        : 'bg-rose-100 hover:bg-rose-200 text-rose-900 border-rose-300'
                    }`}
                  >
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline">Fail (F)</span>
                    <span className="sm:hidden">Fail</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdateScenario(currentStepperScenario.id, { 
                      status: 'Pass', 
                      observations: activeNotes, 
                      media_url: activeMediaUrl 
                    }, true)}
                    className={`min-h-[44px] px-3.5 sm:px-5 py-2 rounded-pill text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95 border ${
                      currentStepperScenario.status === 'Pass'
                        ? 'bg-emerald-600 text-white border-emerald-700'
                        : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border-emerald-300'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline">Pass (P)</span>
                    <span className="sm:hidden">Pass</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: RUN HISTORY VIEW IN PHASE 2 */}
          {viewMode === 'history' && (
            <div className="p-4 sm:p-6 md:p-8 overflow-y-auto flex-1 space-y-4 max-w-6xl w-full mx-auto">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-dark-chassis">Run History</h3>
                  <p className="text-xs text-txt-muted">
                    Inspect past runs, check pass rates, re-download defect reports, or resume unfinished runs.
                  </p>
                </div>

                <button
                  onClick={loadDbTestRuns}
                  disabled={isLoadingRuns}
                  className="min-h-[38px] px-3.5 py-1.5 rounded-pill bg-dark-chassis text-white text-xs font-semibold hover:bg-dark-secondary transition flex items-center gap-1.5 shadow-2xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRuns ? 'animate-spin' : ''}`} />
                  <span>Refresh History</span>
                </button>
              </div>

              {isLoadingRuns && dbTestRuns.length === 0 ? (
                <div className="p-12 text-center text-xs text-txt-muted bg-white rounded-2xl border border-qa-border">
                  Loading run history...
                </div>
              ) : dbTestRuns.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-qa-border text-xs text-txt-muted">
                  No test runs recorded in PostgreSQL yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {dbTestRuns.map((run) => {
                    const isCompleted = run.status === 'completed';
                    const featureNames = run.metadata?.featureNames || [];

                    return (
                      <div
                        key={run.id}
                        className="p-3.5 sm:p-4 rounded-2xl bg-white border border-qa-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-dark-chassis transition"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-xs text-dark-chassis">{run.name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                              isCompleted 
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}>
                              {isCompleted ? '✓ Completed' : 'In Progress'}
                            </span>
                            <span className="text-[11px] text-txt-muted">
                              {new Date(run.started_at || run.created_at).toLocaleString()}
                            </span>
                          </div>

                          {featureNames.length > 0 && (
                            <p className="text-[11px] text-txt-secondary">
                              Features: {featureNames.join(', ')}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono pt-1">
                            <span className="text-emerald-700 font-bold">{run.passed_count} Passed ({run.pass_rate}%)</span>
                            <span>•</span>
                            <span className="text-rose-700 font-bold">{run.failed_count} Failed</span>
                            <span>•</span>
                            <span className="text-amber-700 font-bold">{run.blocked_count} Blocked</span>
                            <span>•</span>
                            <span className="text-txt-muted">{run.untested_count} Untested</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          <button
                            onClick={() => handleDownloadDefectPdf(run)}
                            className="flex-1 sm:flex-none min-h-[38px] px-3 py-1.5 rounded-pill bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                            title="Download PDF defect report for this test run"
                          >
                            <FileDown className="w-3.5 h-3.5 shrink-0" />
                            <span>Defect PDF</span>
                          </button>

                          <button
                            onClick={() => handleResumeRun(run)}
                            className="flex-1 sm:flex-none min-h-[38px] px-3.5 py-1.5 rounded-pill bg-dark-chassis hover:bg-black text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-2xs active:scale-95"
                          >
                            <Play className="w-3.5 h-3.5 text-neon fill-neon shrink-0" />
                            <span>{run.status === 'completed' ? 'View Run' : 'Resume Run'}</span>
                          </button>

                          <button
                            onClick={() => handleDeleteDbRun(run.id)}
                            className="p-2 rounded-full hover:bg-rose-50 text-txt-muted hover:text-rose-600 transition"
                            title="Delete test run record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
  );
}
