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
  ExternalLink
} from 'lucide-react';
import { Project, Feature, QACharter, CharterScenario, ScenarioStatus } from '@/lib/types';
import { supabase } from '@/lib/supabase/client';

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

  // Stepper execution state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [copied, setCopied] = useState(false);
  const [activeNotes, setActiveNotes] = useState('');
  const [activeMediaUrl, setActiveMediaUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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

  // Default: select all features under the project when project changes
  useEffect(() => {
    if (projectFeatures.length > 0) {
      if (currentFeature && projectFeatures.some(f => f.id === currentFeature.id)) {
        // If currentFeature is present, default to all features in this app
        setSelectedFeatureIds(new Set(projectFeatures.map(f => f.id)));
      } else {
        setSelectedFeatureIds(new Set(projectFeatures.map(f => f.id)));
      }
    } else {
      setSelectedFeatureIds(new Set());
    }
  }, [projectFeatures, currentFeature]);

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
      
      // Fetch charters for all selected features
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

      // Feature map for quick lookup
      const featMap = new Map(allFeatures.map(f => [f.id, f]));

      // Group scenarios by charter
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
            charterMission: c.mission
          });
        });
      });

      setRunnableScenarios(flattened);
    } catch (err) {
      console.error('Error loading charters for runner:', err);
    } finally {
      setIsLoadingCharters(false);
    }
  }, [selectedFeatureIds, allFeatures]);

  useEffect(() => {
    if (isOpen) {
      loadChartersForScope();
    }
  }, [isOpen, loadChartersForScope]);

  // Filtered runnable scenarios
  const filteredRunnable = useMemo(() => {
    if (selectedCategoryFilter === 'All') return runnableScenarios;
    return runnableScenarios.filter(s => s.category === selectedCategoryFilter);
  }, [runnableScenarios, selectedCategoryFilter]);

  // Current active scenario in stepper
  const currentScenario = filteredRunnable[currentIndex] || filteredRunnable[0];

  // Sync active scenario notes
  useEffect(() => {
    if (currentScenario) {
      setActiveNotes(currentScenario.observations || '');
      setActiveMediaUrl(currentScenario.media_url || '');
    }
  }, [currentScenario]);

  // Metric counters
  const counters = useMemo(() => {
    let passed = 0;
    let failed = 0;
    let blocked = 0;
    let untested = 0;

    filteredRunnable.forEach(s => {
      if (s.status === 'Pass') passed++;
      else if (s.status === 'Fail') failed++;
      else if (s.status === 'Blocked') blocked++;
      else untested++;
    });

    const total = filteredRunnable.length;
    const executed = passed + failed + blocked;
    const percent = total > 0 ? Math.round((executed / total) * 100) : 0;

    return { total, passed, failed, blocked, untested, executed, percent };
  }, [filteredRunnable]);

  // Status update handler
  const handleUpdateStatus = async (status: ScenarioStatus) => {
    if (!currentScenario) return;

    const scenarioId = currentScenario.id;
    const updates = {
      status,
      observations: activeNotes,
      media_url: activeMediaUrl
    };

    // Optimistic UI update
    setRunnableScenarios(prev => prev.map(s => s.id === scenarioId ? { ...s, ...updates } : s));

    setIsSaving(true);
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
    } catch (err) {
      console.error('Failed saving scenario in runner:', err);
    } finally {
      setIsSaving(false);
    }

    // Auto-advance to next scenario if not at end
    if (currentIndex < filteredRunnable.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  // Keyboard navigation & quick status hotkeys
  useEffect(() => {
    if (!isOpen || phase !== 'running') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in an input/textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        handleUpdateStatus('Pass');
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        handleUpdateStatus('Fail');
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        handleUpdateStatus('Blocked');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (currentIndex < filteredRunnable.length - 1) setCurrentIndex(prev => prev + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, phase, currentIndex, filteredRunnable.length, currentScenario, activeNotes, activeMediaUrl]);

  // Copy Formatted Test Run Summary Report
  const handleCopyReport = () => {
    const proj = allProjects.find(p => p.id === selectedProjectId);
    let text = `# Test Run Report: ${proj?.name || 'QA Test Run'}\n`;
    text += `Date: ${new Date().toLocaleDateString()}\n`;
    text += `Progress: ${counters.executed}/${counters.total} (${counters.percent}%)\n`;
    text += `Passed: ${counters.passed} | Failed: ${counters.failed} | Blocked: ${counters.blocked} | Untested: ${counters.untested}\n\n`;
    text += `Feature\tCharter Code\tPrompt ID\tCategory\tScenario Prompt\tStatus\tObservations\n`;

    filteredRunnable.forEach(s => {
      text += `${s.featureName}\t${s.charterCode}\t${s.prompt_id}\t${s.category || 'Exploratory'}\t${s.prompt_text}\t${s.status}\t${s.observations || ''}\n`;
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-dark-chassis/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-qa-white rounded-[28px] border border-qa-border shadow-modal max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden text-txt-primary">
        
        {/* Modal Top Bar */}
        <div className="bg-dark-chassis text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-dark-secondary">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-neon text-dark-chassis flex items-center justify-center font-bold text-xs shadow-sm">
              <Play className="w-4 h-4 fill-dark-chassis" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight text-white">
                  Multi-Feature Charter Test Runner
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-dark-secondary text-neon border border-dark-tertiary">
                  {phase === 'setup' ? 'SCOPE CONFIGURATION' : 'ACTIVE EXECUTION'}
                </span>
              </div>
              <p className="text-[11px] text-txt-muted">
                {phase === 'setup'
                  ? 'Select the application and features to include in this test execution cycle'
                  : `Running suite across ${selectedFeatureIds.size} feature${selectedFeatureIds.size === 1 ? '' : 's'}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {phase === 'running' && (
              <button
                onClick={() => setPhase('setup')}
                className="px-3 py-1.5 rounded-pill text-xs font-semibold bg-dark-secondary hover:bg-dark-tertiary text-white transition flex items-center gap-1.5 border border-dark-tertiary"
              >
                <Sliders className="w-3.5 h-3.5" />
                Change Scope
              </button>
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
            {/* Project Picker */}
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
                    2. Select Features to Test
                  </label>
                  <span className="text-[11px] text-txt-secondary">
                    Check the feature flows to bundle into this testing cycle
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
                              {feat.purpose || feat.description || 'Core service flow'}
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

            {/* Scope Summary & Launch Bar */}
            <div className="p-4 rounded-2xl bg-dark-chassis text-white flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-neon">
                    {runnableScenarios.length} Total Test Scenarios Ready
                  </span>
                  <span className="text-[11px] text-txt-muted">
                    across {loadedCharters.length} charters in {selectedFeatureIds.size} feature(s)
                  </span>
                </div>
                <p className="text-[11px] text-txt-muted mt-0.5">
                  Includes Golden Path, Alternative Flows, Boundary checks, and Recovery scenarios
                </p>
              </div>

              <button
                type="button"
                disabled={isLoadingCharters || runnableScenarios.length === 0}
                onClick={() => {
                  setCurrentIndex(0);
                  setPhase('running');
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
            {/* Runner Progress & Counter Header */}
            <div className="bg-qa-surface p-4 border-b border-qa-border flex flex-wrap items-center justify-between gap-3">
              {/* Progress Counters */}
              <div className="flex items-center gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-dark-chassis">
                      Run Progress: {counters.executed} of {counters.total}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-indigo-700">
                      ({counters.percent}%)
                    </span>
                  </div>
                  {/* Progress Bar */}
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

              {/* View Mode & Export Tools */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode(viewMode === 'card' ? 'table' : 'card')}
                  className="px-3 py-1 rounded-pill bg-qa-white border border-qa-border text-dark-chassis text-xs font-semibold hover:bg-qa-warm transition flex items-center gap-1.5 shadow-2xs"
                >
                  {viewMode === 'card' ? 'View Grid Mode' : 'Guided Card Mode'}
                </button>

                <button
                  onClick={handleCopyReport}
                  className="px-3 py-1 rounded-pill bg-dark-chassis text-white text-xs font-semibold hover:bg-dark-secondary transition flex items-center gap-1.5 shadow-xs"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-neon" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied Report' : 'Copy Report'}</span>
                </button>
              </div>
            </div>

            {/* Runner Body: Guided Card Mode */}
            {viewMode === 'card' && currentScenario && (
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {/* Stepper Status & Category Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-dark-chassis text-white text-xs font-mono font-bold">
                      {currentIndex + 1} / {filteredRunnable.length}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-900 border border-indigo-300 text-xs font-bold">
                      {currentScenario.featureName}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-qa-surface text-txt-secondary border border-qa-border text-xs font-mono">
                      {currentScenario.charterCode}
                    </span>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border font-mono ${
                    currentScenario.category === 'Golden Path'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : currentScenario.category === 'Alternative Flow'
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : currentScenario.category === 'Failure & Recovery'
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}>
                    {currentScenario.category || 'Exploratory'}
                  </span>
                </div>

                {/* Scenario Mission & Prompt Card */}
                <div className="p-6 rounded-3xl bg-qa-surface border-2 border-qa-border shadow-card space-y-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-txt-muted block mb-1">
                      Charter Mission:
                    </span>
                    <p className="text-xs text-txt-secondary font-medium italic">
                      &quot;{currentScenario.charterMission}&quot;
                    </p>
                  </div>

                  <div className="pt-3 border-t border-qa-border">
                    <span className="text-[10px] font-mono font-bold text-indigo-700 uppercase tracking-wider block mb-1.5">
                      Exploration Prompt / Investigative Mission:
                    </span>
                    <p className="text-sm sm:text-base font-semibold text-dark-chassis leading-relaxed">
                      {currentScenario.prompt_text}
                    </p>
                  </div>

                  {currentScenario.traceability && (
                    <div className="pt-2 text-[11px] text-slate-600 flex flex-wrap items-center gap-2">
                      <span className="font-bold text-dark-chassis">Grounded In:</span>
                      <span>
                        {currentScenario.traceability.derived_from
                          ? Object.entries(currentScenario.traceability.derived_from)
                              .filter(([, v]) => (Array.isArray(v) ? v.length > 0 : !!v))
                              .map(([k, v]) => `${k.replace('_', ' ')}: ${Array.isArray(v) ? v.join(', ') : v}`)
                              .join(' • ') || 'Empirical Screen Evidence'
                          : 'Empirical Screen Evidence'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Observations & Evidence Input */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-dark-chassis block">
                      Observations &amp; Bug Notes
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Record what happened during exploration (e.g. app froze, button remained disabled, balance deducted instantly)..."
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
                      placeholder="Paste image URL, Loom link, or defect screenshot..."
                      value={activeMediaUrl}
                      onChange={(e) => setActiveMediaUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-qa-white border border-qa-border rounded-xl text-xs focus:outline-none focus:border-dark-chassis placeholder:text-txt-muted shadow-2xs"
                    />
                    <span className="text-[10px] text-txt-muted block pt-1">
                      Keyboard shortcuts: <kbd className="px-1.5 py-0.5 bg-qa-warm border rounded font-mono text-[10px]">P</kbd> Pass, <kbd className="px-1.5 py-0.5 bg-qa-warm border rounded font-mono text-[10px]">F</kbd> Fail, <kbd className="px-1.5 py-0.5 bg-qa-warm border rounded font-mono text-[10px]">B</kbd> Block, <kbd className="px-1.5 py-0.5 bg-qa-warm border rounded font-mono text-[10px]">→</kbd> Next
                    </span>
                  </div>
                </div>

                {/* Rapid Decision Action Bar */}
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
                      disabled={currentIndex === filteredRunnable.length - 1}
                      onClick={() => setCurrentIndex(prev => prev + 1)}
                      className="px-3.5 py-2 rounded-pill bg-qa-surface hover:bg-qa-warm text-dark-chassis text-xs font-bold border border-qa-border transition flex items-center gap-1 disabled:opacity-40"
                    >
                      <span>Skip / Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 3 Outcome Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus('Blocked')}
                      className={`px-4 py-2 rounded-pill text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95 border ${
                        currentScenario.status === 'Blocked'
                          ? 'bg-amber-500 text-white border-amber-600'
                          : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4" />
                      <span>Block (B)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateStatus('Fail')}
                      className={`px-4 py-2 rounded-pill text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95 border ${
                        currentScenario.status === 'Fail'
                          ? 'bg-rose-600 text-white border-rose-700'
                          : 'bg-rose-100 hover:bg-rose-200 text-rose-900 border-rose-300'
                      }`}
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Fail (F)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateStatus('Pass')}
                      className={`px-5 py-2 rounded-pill text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95 border ${
                        currentScenario.status === 'Pass'
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

            {/* Runner Body: Consolidated Table Mode */}
            {viewMode === 'table' && (
              <div className="p-4 overflow-auto flex-1">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-qa-surface border-b border-qa-border text-txt-muted uppercase font-mono text-[10px]">
                      <th className="p-3">#</th>
                      <th className="p-3">Feature</th>
                      <th className="p-3">Charter</th>
                      <th className="p-3">Category</th>
                      <th className="p-3 w-1/2">Scenario Prompt</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-qa-border/70">
                    {filteredRunnable.map((s, idx) => (
                      <tr 
                        key={s.id}
                        className={`hover:bg-qa-warm/60 transition ${
                          idx === currentIndex ? 'bg-indigo-50/70 font-medium' : ''
                        }`}
                      >
                        <td className="p-3 font-mono text-txt-muted">{idx + 1}</td>
                        <td className="p-3 font-bold text-dark-chassis">{s.featureName}</td>
                        <td className="p-3 font-mono text-txt-secondary">{s.charterCode}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-qa-surface border border-qa-border">
                            {s.category || 'Exploratory'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-800 leading-relaxed">{s.prompt_text}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            s.status === 'Pass' ? 'bg-emerald-100 text-emerald-800' :
                            s.status === 'Fail' ? 'bg-rose-100 text-rose-800' :
                            s.status === 'Blocked' ? 'bg-amber-100 text-amber-800' :
                            'bg-qa-surface text-slate-500'
                          }`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setCurrentIndex(idx);
                              setViewMode('card');
                            }}
                            className="px-2.5 py-1 rounded-pill bg-qa-warm hover:bg-dark-chassis hover:text-white text-[11px] font-medium border border-qa-border transition"
                          >
                            Execute
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
