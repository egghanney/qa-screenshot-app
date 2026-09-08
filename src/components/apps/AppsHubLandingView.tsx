'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Smartphone, 
  Globe, 
  Monitor, 
  Layers, 
  Plus, 
  Search, 
  ArrowRight, 
  Play, 
  CheckCircle2, 
  ClipboardList, 
  Sparkles,
  Settings,
  Grid,
  Filter,
  ExternalLink,
  LayoutGrid,
  List,
  History,
  RefreshCw,
  Trash2,
  FileDown,
  CheckCheck,
  Clock,
  Database,
  ChevronDown
} from 'lucide-react';
import { Project, Feature, QATestRun, QACharter, CharterScenario } from '@/lib/types';
import { supabase } from '@/lib/supabase/client';
import { 
  exportDefectReportPdf, 
  extractDefectsFromRunSnapshot, 
  DefectReportMetadata 
} from '@/lib/defectReportExport';
import { CreateAppModal } from './CreateAppModal';
import { CustomSelect } from '@/components/ui/CustomSelect';

interface AppsHubLandingViewProps {
  projects: Project[];
  features: Feature[];
  chartersCountByProject?: Record<string, number>;
  scenariosCountByProject?: Record<string, number>;
  onSelectProject: (projectId: string) => void;
  onRunAppCharters?: (project: Project) => void;
  onResumeRun?: (run: QATestRun) => void;
  onRefreshProjects: () => Promise<void>;
  onOpenSettings?: () => void;
}

export function AppsHubLandingView({
  projects,
  features,
  chartersCountByProject = {},
  scenariosCountByProject = {},
  onSelectProject,
  onRunAppCharters,
  onResumeRun,
  onRefreshProjects,
  onOpenSettings
}: AppsHubLandingViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'All' | 'Mobile' | 'Web'>('All');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [hubTab, setHubTab] = useState<'apps' | 'runs'>('apps');

  // Database-backed Test Runs
  const [dbRuns, setDbRuns] = useState<QATestRun[]>([]);
  const [isLoadingDbRuns, setIsLoadingDbRuns] = useState(false);
  const [selectedRunProductFilter, setSelectedRunProductFilter] = useState<string>('All');
  const [downloadingRunId, setDownloadingRunId] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('qa_apps_view_mode');
      if (saved === 'list' || saved === 'grid') return saved;
    }
    return 'grid';
  });

  const handleSetViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('qa_apps_view_mode', mode);
    }
  };

  // Fetch test runs from PostgreSQL database
  const loadDbRuns = useCallback(async () => {
    setIsLoadingDbRuns(true);
    try {
      const res = await fetch('/api/test-runs');
      const data = await res.json();
      if (data.runs) {
        setDbRuns(data.runs);
      }
    } catch (err) {
      console.error('Error fetching test runs for Apps Hub:', err);
    } finally {
      setIsLoadingDbRuns(false);
    }
  }, []);

  useEffect(() => {
    loadDbRuns();
  }, [loadDbRuns]);

  const handleDeleteRun = async (runId: string) => {
    if (!confirm('Are you sure you want to delete this test run record?')) return;
    try {
      await fetch(`/api/test-runs?id=${runId}`, { method: 'DELETE' });
      setDbRuns(prev => prev.filter(r => r.id !== runId));
    } catch (err) {
      console.error('Failed deleting run:', err);
    }
  };

  // Product filter counts for Test Runs
  const runsCountByProject = useMemo(() => {
    const counts: Record<string, number> = { All: dbRuns.length };
    projects.forEach(p => {
      counts[p.id] = 0;
    });
    dbRuns.forEach(r => {
      if (r.project_id && counts[r.project_id] !== undefined) {
        counts[r.project_id] = (counts[r.project_id] || 0) + 1;
      }
    });
    return counts;
  }, [dbRuns, projects]);

  const runProductFilterOptions = useMemo(() => {
    return [
      {
        value: 'All',
        label: 'All Products',
        count: runsCountByProject['All'] || 0,
        icon: <Database className="w-3.5 h-3.5 text-txt-muted" />
      },
      ...projects.map(proj => ({
        value: proj.id,
        label: proj.name,
        count: runsCountByProject[proj.id] || 0,
        icon: (proj.platform === 'Web' || proj.platform === 'Mobile Web') 
          ? <Globe className="w-3.5 h-3.5 text-txt-muted" /> 
          : <Smartphone className="w-3.5 h-3.5 text-txt-muted" />
      }))
    ];
  }, [projects, runsCountByProject]);

  const filteredDbRuns = useMemo(() => {
    if (selectedRunProductFilter === 'All') return dbRuns;
    return dbRuns.filter(r => r.project_id === selectedRunProductFilter);
  }, [dbRuns, selectedRunProductFilter]);

  // Download Defect Report PDF for a specific test run record
  const handleDownloadRunReport = async (run: QATestRun) => {
    try {
      setDownloadingRunId(run.id);

      const featureIds: string[] = (run.metadata?.featureIds && run.metadata.featureIds.length > 0)
        ? run.metadata.featureIds
        : features.filter(f => f.project_id === run.project_id).map(f => f.id);

      let enrichedCharters: QACharter[] = [];
      if (featureIds.length > 0) {
        const { data: chartersData, error: cErr } = await supabase
          .from('qa_charters')
          .select('*')
          .in('feature_id', featureIds);

        if (!cErr && chartersData) {
          const charterIds = chartersData.map((c: any) => c.id);
          let scenariosData: any[] = [];
          if (charterIds.length > 0) {
            const { data: sData } = await supabase
              .from('qa_charter_scenarios')
              .select('*')
              .in('charter_id', charterIds);
            scenariosData = sData || [];
          }

          enrichedCharters = chartersData.map((c: any) => ({
            ...c,
            scenarios: scenariosData.filter((s: any) => s.charter_id === c.id)
          }));
        }
      }

      const featMap = new Map(features.map(f => [f.id, f.name]));
      const defects = extractDefectsFromRunSnapshot(run, enrichedCharters, featMap);

      const proj = projects.find(p => p.id === run.project_id);
      const projectName = proj?.name || 'QA Test Studio';
      const featureNames = run.metadata?.featureNames || 
        featureIds.map(id => featMap.get(id) || 'Feature');

      const metadata: DefectReportMetadata = {
        projectName,
        runName: run.name,
        platform: proj?.platform || 'General',
        featureNames,
        totalScenarios: run.total_scenarios,
        passedCount: run.passed_count,
        failedCount: run.failed_count,
        blockedCount: run.blocked_count,
        untestedCount: run.untested_count,
        passRate: run.pass_rate,
        environment: run.metadata?.environment || 'Exploratory QA Session',
        testerName: run.metadata?.testerName || 'QA Engineer',
        generatedDate: new Date(run.started_at || run.created_at).toLocaleDateString()
      };

      exportDefectReportPdf(metadata, defects);
    } catch (err) {
      console.error('Failed to export defect PDF report:', err);
      alert('Unable to generate defect PDF report. Please try again.');
    } finally {
      setDownloadingRunId(null);
    }
  };

  // Group features by project
  const featuresByProject = useMemo(() => {
    const map: Record<string, Feature[]> = {};
    features.forEach(f => {
      if (!map[f.project_id]) map[f.project_id] = [];
      map[f.project_id].push(f);
    });
    return map;
  }, [features]);

  // Filtered applications
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const isMobile = p.platform === 'Android' || p.platform === 'iOS' || p.platform === 'Mobile Web';
      const isWeb = p.platform === 'Web';

      const matchesPlatform = 
        platformFilter === 'All' ? true :
        platformFilter === 'Mobile' ? isMobile :
        platformFilter === 'Web' ? isWeb : true;

      return matchesSearch && matchesPlatform;
    });
  }, [projects, searchQuery, platformFilter]);

  // Overall metrics
  const totalFeatures = features.length;
  const totalCharters = Object.values(chartersCountByProject).reduce((a, b) => a + b, 0);

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'Web':
        return <Globe className="w-4 h-4 text-blue-400" />;
      case 'Mobile Web':
        return <Monitor className="w-4 h-4 text-purple-400" />;
      case 'iOS':
      case 'Android':
      default:
        return <Smartphone className="w-4 h-4 text-neon" />;
    }
  };

  return (
    <div className="min-h-screen bg-qa-bg text-txt-primary flex flex-col">
      {/* Studio Header Bar */}
      <header className="bg-dark-chassis text-white border-b border-dark-secondary px-3.5 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-neon text-dark-chassis flex items-center justify-center font-bold text-xs shadow-sm shadow-neon/40 shrink-0">
            QA
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="font-bold tracking-tight text-sm sm:text-base text-white truncate">
                QA <span className="text-neon">//</span> TEST STUDIO
              </h1>
              <span className="hidden xs:inline-block px-2 py-0.5 rounded-full text-[10px] font-mono bg-dark-secondary text-txt-muted border border-dark-tertiary">
                APPS HUB
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-txt-muted truncate hidden sm:block">
              Select an application workspace to view screen flows, journeys, and run test charters
            </p>
          </div>
        </div>

        {/* Global Action Tools */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-dark-secondary hover:bg-dark-tertiary text-txt-muted hover:text-white flex items-center justify-center transition border border-dark-tertiary"
              title="Settings & API Keys"
            >
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-pill bg-neon hover:bg-neon-bright text-dark-chassis text-xs font-bold transition shadow-card flex items-center gap-1.5 sm:gap-2 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
            <span className="hidden xs:inline">New Application</span>
            <span className="xs:hidden">New App</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3.5 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
        {/* KPI Metric Ribbon */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-qa-white border border-qa-border shadow-xs space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-txt-muted block">Applications</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-dark-chassis">{projects.length}</span>
              <span className="text-[11px] text-txt-secondary">Workspaces</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-qa-white border border-qa-border shadow-xs space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-txt-muted block">Mapped Features</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-dark-chassis">{totalFeatures}</span>
              <span className="text-[11px] text-txt-secondary">Flows</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-qa-white border border-qa-border shadow-xs space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-txt-muted block">Active Charters</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-dark-chassis">{totalCharters}</span>
              <span className="text-[11px] text-txt-secondary">Test Suites</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-qa-white border border-qa-border shadow-xs space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-txt-muted block">Database Runs</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-dark-chassis">{dbRuns.length}</span>
              <span className="text-[11px] text-emerald-700 font-semibold">Recorded</span>
            </div>
          </div>
        </div>

        {/* Hub Navigation Tabs: Applications vs Run History */}
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 sm:gap-4 border-b border-qa-border pb-3">
          <div className="flex items-center gap-1 sm:gap-2 bg-qa-white p-1 rounded-pill border border-qa-border shadow-2xs shrink-0">
            <button
              onClick={() => setHubTab('apps')}
              className={`px-3 sm:px-4 py-1.5 rounded-pill text-xs font-bold transition flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                hubTab === 'apps'
                  ? 'bg-dark-chassis text-white shadow-2xs'
                  : 'text-txt-muted hover:text-dark-chassis'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Applications ({projects.length})</span>
              <span className="sm:hidden">Apps ({projects.length})</span>
            </button>

            <button
              onClick={() => {
                setHubTab('runs');
                loadDbRuns();
              }}
              className={`px-3 sm:px-4 py-1.5 rounded-pill text-xs font-bold transition flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                hubTab === 'runs'
                  ? 'bg-dark-chassis text-white shadow-2xs'
                  : 'text-txt-muted hover:text-dark-chassis'
              }`}
            >
              <History className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Run History ({dbRuns.length})</span>
              <span className="sm:hidden">Runs ({dbRuns.length})</span>
            </button>
          </div>

          {hubTab === 'runs' && (
            <button
              onClick={loadDbRuns}
              disabled={isLoadingDbRuns}
              className="px-3 sm:px-3.5 py-1.5 rounded-pill bg-qa-white hover:bg-qa-warm text-dark-chassis text-xs font-semibold border border-qa-border transition flex items-center gap-1.5 shadow-2xs whitespace-nowrap active:scale-95 disabled:opacity-60 ml-auto sm:ml-0 shrink-0"
              title="Refresh test run history"
            >
              <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isLoadingDbRuns ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh History</span>
              <span className="sm:hidden">Refresh</span>
            </button>
          )}
        </div>

        {/* VIEW 1: APPLICATIONS LIST / GRID */}
        {hubTab === 'apps' && (
          <div className="space-y-6">
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-qa-white p-3 rounded-2xl border border-qa-border shadow-2xs">
              {/* Search Input */}
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-txt-muted absolute left-3 top-2.5 pointer-events-none" />
                <input 
                  type="text"
                  placeholder="Search applications by name or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-qa-surface border border-qa-border rounded-pill text-xs focus:outline-none focus:border-dark-chassis placeholder:text-txt-muted transition"
                />
              </div>

              {/* Controls Right: Platform Filter & Layout View Mode */}
              <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
                {/* Platform Filter Buttons */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-txt-muted font-mono mr-1">Filter:</span>
                  {(['All', 'Mobile', 'Web'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setPlatformFilter(tab)}
                      className={`px-3 py-1 rounded-pill text-xs font-medium transition ${
                        platformFilter === tab
                          ? 'bg-dark-chassis text-white font-bold shadow-xs'
                          : 'bg-qa-surface text-txt-secondary hover:bg-qa-warm border border-qa-border'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* View Mode Toggle: Grid vs List (Pill integrity) */}
                <div className="flex items-center gap-1 bg-qa-surface p-1 rounded-pill border border-qa-border">
                  <button
                    type="button"
                    onClick={() => handleSetViewMode('grid')}
                    className={`p-1.5 rounded-pill transition ${
                      viewMode === 'grid'
                        ? 'bg-dark-chassis text-white shadow-xs'
                        : 'text-txt-muted hover:text-dark-chassis'
                    }`}
                    title="Grid View"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetViewMode('list')}
                    className={`p-1.5 rounded-pill transition ${
                      viewMode === 'list'
                        ? 'bg-dark-chassis text-white shadow-xs'
                        : 'text-txt-muted hover:text-dark-chassis'
                    }`}
                    title="List View"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Applications List / Grid */}
            {filteredProjects.length === 0 ? (
              <div className="p-12 text-center bg-qa-white rounded-3xl border border-qa-border shadow-card space-y-4 max-w-md mx-auto">
                <div className="w-12 h-12 rounded-full bg-dark-chassis text-neon flex items-center justify-center mx-auto">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-dark-chassis">
                  {projects.length === 0 ? 'No Applications Registered Yet' : 'No Matching Applications Found'}
                </h3>
                <p className="text-xs text-txt-secondary leading-relaxed">
                  {projects.length === 0 
                    ? 'Register your first application workspace to upload screenshots, reconstruct user journeys, and generate test charters.'
                    : 'Try adjusting your search query or platform filter to locate your application.'}
                </p>
                {projects.length === 0 && (
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-5 py-2.5 rounded-pill bg-neon hover:bg-neon-bright text-dark-chassis text-xs font-bold transition shadow-card inline-flex items-center gap-2 active:scale-95"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Create Your First Application</span>
                  </button>
                )}
              </div>
            ) : viewMode === 'list' ? (
              /* LIST VIEW MODE */
              <div className="space-y-3">
                {/* Desktop Table */}
                <div className="hidden md:block bg-qa-white rounded-2xl border border-qa-border shadow-xs overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-qa-warm/70 border-b border-qa-border text-txt-muted uppercase font-mono text-[10px]">
                        <th className="py-3 px-5">Application</th>
                        <th className="py-3 px-4">Platform</th>
                        <th className="py-3 px-4">Mapped Features</th>
                        <th className="py-3 px-4">Exploratory Charters</th>
                        <th className="py-3 px-4">Test Scenarios</th>
                        <th className="py-3 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-qa-border/60">
                      {filteredProjects.map((proj) => {
                        const projFeats = featuresByProject[proj.id] || [];
                        const cCount = chartersCountByProject[proj.id] || 0;
                        const sCount = scenariosCountByProject[proj.id] || 0;

                        return (
                          <tr 
                            key={proj.id}
                            onClick={() => onSelectProject(proj.id)}
                            className="hover:bg-qa-warm/50 cursor-pointer transition-colors group"
                          >
                            <td className="py-4 px-5">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-dark-chassis text-neon flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                                  {proj.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <span className="font-bold text-dark-chassis text-sm block group-hover:text-neon-dark transition-colors">
                                    {proj.name}
                                  </span>
                                  <span className="text-[11px] text-txt-secondary line-clamp-1 max-w-sm">
                                    {proj.description || 'Application workspace ready for exploratory testing'}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="py-4 px-4">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono bg-qa-surface border border-qa-border text-slate-800">
                                {getPlatformIcon(proj.platform)}
                                <span>{proj.platform || 'General'}</span>
                              </span>
                            </td>

                            <td className="py-4 px-4">
                              <span className="font-bold text-dark-chassis">{projFeats.length}</span>
                              <span className="text-[11px] text-txt-muted ml-1">flows</span>
                            </td>

                            <td className="py-4 px-4">
                              {cCount > 0 ? (
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-dark-chassis text-neon">
                                  {cCount} Charters
                                </span>
                              ) : (
                                <span className="text-[11px] text-txt-muted italic">None yet</span>
                              )}
                            </td>

                            <td className="py-4 px-4 font-mono text-slate-700">
                              {sCount > 0 ? `${sCount} scenarios` : '—'}
                            </td>

                            <td className="py-4 px-5 text-right">
                              <div className="inline-flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                {onRunAppCharters && (
                                  <button
                                    type="button"
                                    onClick={() => onRunAppCharters(proj)}
                                    className="px-3 py-1.5 rounded-pill bg-dark-chassis hover:bg-black text-neon text-xs font-bold transition flex items-center gap-1.5 shadow-2xs active:scale-95"
                                    title="Run full suite in Full-Page Studio"
                                  >
                                    <Play className="w-3 h-3 fill-neon" />
                                    <span>Run Suite</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => onSelectProject(proj.id)}
                                  className="px-3 py-1.5 rounded-pill bg-qa-warm hover:bg-neon hover:text-dark-chassis text-dark-chassis text-xs font-bold transition flex items-center gap-1 border border-qa-border"
                                >
                                  <span>Open</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Application Cards for Small Screens */}
                <div className="md:hidden space-y-3">
                  {filteredProjects.map((proj) => {
                    const projFeats = featuresByProject[proj.id] || [];
                    const cCount = chartersCountByProject[proj.id] || 0;
                    const sCount = scenariosCountByProject[proj.id] || 0;

                    return (
                      <div
                        key={proj.id}
                        onClick={() => onSelectProject(proj.id)}
                        className="p-4 rounded-2xl bg-qa-white border border-qa-border hover:border-dark-chassis/40 shadow-xs space-y-3 cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-dark-chassis text-neon flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                              {proj.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-dark-chassis text-sm block truncate">
                                {proj.name}
                              </span>
                              <span className="text-[11px] text-txt-secondary line-clamp-1">
                                {proj.description || 'Application workspace ready for exploratory testing'}
                              </span>
                            </div>
                          </div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-qa-surface border border-qa-border text-slate-800 shrink-0">
                            {getPlatformIcon(proj.platform)}
                            <span>{proj.platform || 'General'}</span>
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs border-t border-qa-border/60 pt-2 text-txt-secondary font-mono">
                          <span>{projFeats.length} flows</span>
                          <span>•</span>
                          <span>{cCount} charters</span>
                          <span>•</span>
                          <span>{sCount} scenarios</span>
                        </div>

                        <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                          {onRunAppCharters && (
                            <button
                              type="button"
                              onClick={() => onRunAppCharters(proj)}
                              className="flex-1 py-2 rounded-pill bg-dark-chassis hover:bg-black text-neon text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs active:scale-95"
                            >
                              <Play className="w-3 h-3 fill-neon" />
                              <span>Run Suite</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onSelectProject(proj.id)}
                            className="flex-1 py-2 rounded-pill bg-qa-warm text-dark-chassis text-xs font-bold transition flex items-center justify-center gap-1 border border-qa-border"
                          >
                            <span>Open</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* GRID VIEW MODE */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((proj) => {
                  const projFeats = featuresByProject[proj.id] || [];
                  const cCount = chartersCountByProject[proj.id] || 0;
                  const sCount = scenariosCountByProject[proj.id] || 0;

                  return (
                    <div
                      key={proj.id}
                      className="p-6 rounded-3xl bg-qa-white border border-qa-border hover:border-dark-chassis/40 shadow-xs hover:shadow-card transition-all duration-200 flex flex-col justify-between space-y-6 group cursor-pointer"
                      onClick={() => onSelectProject(proj.id)}
                    >
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-dark-chassis text-neon flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
                            {proj.name.substring(0, 2).toUpperCase()}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-qa-surface border border-qa-border text-slate-800 flex items-center gap-1.5">
                              {getPlatformIcon(proj.platform)}
                              <span>{proj.platform || 'General'}</span>
                            </span>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-base font-bold text-dark-chassis tracking-tight group-hover:text-neon-dark transition-colors">
                            {proj.name}
                          </h3>
                          <p className="text-xs text-txt-secondary line-clamp-2 mt-1 leading-relaxed">
                            {proj.description || 'Application workspace ready for automated journeys and exploratory testing.'}
                          </p>
                        </div>

                        {/* Metrics Pills */}
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-qa-border/60 text-center">
                          <div className="p-2 rounded-xl bg-qa-surface border border-qa-border/60">
                            <span className="text-[10px] font-mono text-txt-muted uppercase block">Features</span>
                            <span className="text-sm font-bold text-dark-chassis">{projFeats.length}</span>
                          </div>
                          <div className="p-2 rounded-xl bg-qa-surface border border-qa-border/60">
                            <span className="text-[10px] font-mono text-txt-muted uppercase block">Charters</span>
                            <span className="text-sm font-bold text-dark-chassis">{cCount}</span>
                          </div>
                          <div className="p-2 rounded-xl bg-qa-surface border border-qa-border/60">
                            <span className="text-[10px] font-mono text-txt-muted uppercase block">Scenarios</span>
                            <span className="text-sm font-bold text-dark-chassis">{sCount}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="pt-3 border-t border-qa-border/70 flex items-center justify-between gap-2">
                        {onRunAppCharters && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRunAppCharters(proj);
                            }}
                            className="px-3 py-1.5 rounded-pill bg-dark-chassis hover:bg-black text-neon text-xs font-bold transition flex items-center gap-1.5 shadow-2xs active:scale-95"
                            title="Launch Full-Page Test Runner"
                          >
                            <Play className="w-3 h-3 fill-neon" />
                            <span>Run Suite</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onSelectProject(proj.id)}
                          className="px-4 py-1.5 rounded-pill bg-qa-warm group-hover:bg-neon text-dark-chassis text-xs font-bold transition flex items-center gap-1.5 border border-qa-border group-hover:border-neon shadow-2xs"
                        >
                          <span>Open Workspace</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: TEAM TEST RUN HISTORY ON HOME PAGE */}
        {hubTab === 'runs' && (
          <div className="space-y-4">
            {/* Product Filter Bar */}
            {dbRuns.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 p-3 sm:p-3.5 bg-qa-white rounded-2xl border border-qa-border shadow-xs">
                <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
                  <CustomSelect
                    value={selectedRunProductFilter}
                    onChange={setSelectedRunProductFilter}
                    options={runProductFilterOptions}
                    label="Product"
                    leadingIcon={<Filter className="w-3.5 h-3.5" />}
                    mobileTitle="Filter Runs by Product"
                    className="w-full sm:w-auto"
                    buttonClassName="w-full sm:w-auto min-w-[200px] sm:min-w-[220px]"
                  />
                </div>

                <div className="text-[11px] sm:text-xs text-txt-muted font-mono self-end sm:self-auto">
                  Showing {filteredDbRuns.length} of {dbRuns.length} runs
                </div>
              </div>
            )}

            {isLoadingDbRuns && dbRuns.length === 0 ? (
              <div className="p-12 text-center bg-qa-white rounded-3xl border border-qa-border text-xs text-txt-muted">
                Loading test run history from database...
              </div>
            ) : dbRuns.length === 0 ? (
              <div className="p-12 text-center bg-qa-white rounded-3xl border border-qa-border space-y-3 max-w-md mx-auto">
                <div className="w-12 h-12 rounded-full bg-dark-chassis text-neon flex items-center justify-center mx-auto">
                  <History className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-dark-chassis">No Test Runs Recorded Yet</h3>
                <p className="text-xs text-txt-secondary leading-relaxed">
                  When you execute exploratory test cycles in the Test Run Studio, every run session and pass rate is saved here for team review.
                </p>
              </div>
            ) : filteredDbRuns.length === 0 ? (
              <div className="p-12 text-center bg-qa-white rounded-3xl border border-qa-border space-y-2">
                <p className="text-sm font-semibold text-dark-chassis">No test runs found for this product.</p>
                <button
                  type="button"
                  onClick={() => setSelectedRunProductFilter('All')}
                  className="text-xs text-neon-dark underline font-medium hover:text-dark-chassis"
                >
                  View all test runs ({dbRuns.length})
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDbRuns.map((run) => {
                  const isCompleted = run.status === 'completed';
                  const featureNames = run.metadata?.featureNames || [];
                  const targetProj = projects.find(p => p.id === run.project_id);

                  return (
                    <div
                      key={run.id}
                      className="p-4 sm:p-5 rounded-3xl bg-qa-white border border-qa-border hover:border-dark-chassis/40 shadow-xs hover:shadow-card transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-dark-chassis">{run.name}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            isCompleted 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}>
                            {isCompleted ? '✓ Completed' : 'In Progress'}
                          </span>
                          <span className="text-[11px] text-txt-muted flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(run.started_at || run.created_at).toLocaleString()}
                          </span>
                        </div>

                        {targetProj && (
                          <div className="text-xs text-txt-secondary flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <span>Product: <strong className="text-dark-chassis">{targetProj.name}</strong></span>
                            {featureNames.length > 0 && <span>•</span>}
                            {featureNames.length > 0 && (
                              <span>Features Tested: <strong className="text-dark-chassis">{featureNames.join(', ')}</strong></span>
                            )}
                          </div>
                        )}
                        {!targetProj && featureNames.length > 0 && (
                          <p className="text-xs text-txt-secondary">
                            Features Tested: <strong className="text-dark-chassis">{featureNames.join(', ')}</strong>
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-mono pt-1">
                          <span className="text-emerald-700 font-bold">{run.passed_count} Passed ({run.pass_rate}%)</span>
                          <span>•</span>
                          <span className="text-rose-700 font-bold">{run.failed_count} Failed</span>
                          <span>•</span>
                          <span className="text-amber-700 font-bold">{run.blocked_count} Blocked</span>
                          <span>•</span>
                          <span className="text-txt-muted">{run.untested_count} Untested</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleDownloadRunReport(run)}
                          disabled={downloadingRunId === run.id}
                          className="flex-1 sm:flex-initial px-3.5 py-2 rounded-pill bg-white hover:bg-slate-100 text-dark-chassis border border-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-2xs active:scale-95 disabled:opacity-60 cursor-pointer min-h-[36px]"
                          title="Download PDF Defect Report"
                        >
                          <FileDown className={`w-3.5 h-3.5 text-rose-600 ${downloadingRunId === run.id ? 'animate-bounce' : ''}`} />
                          <span>{downloadingRunId === run.id ? 'Generating...' : 'Defect PDF'}</span>
                        </button>

                        {onResumeRun ? (
                          <button
                            type="button"
                            onClick={() => onResumeRun(run)}
                            className="flex-1 sm:flex-initial px-4 py-2 rounded-pill bg-dark-chassis hover:bg-black text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-2xs active:scale-95 min-h-[36px]"
                          >
                            <Play className="w-3.5 h-3.5 text-neon fill-neon" />
                            <span>{isCompleted ? 'View Run' : 'Resume Run'}</span>
                          </button>
                        ) : (targetProj && onRunAppCharters && (
                          <button
                            type="button"
                            onClick={() => onRunAppCharters(targetProj)}
                            className="flex-1 sm:flex-initial px-4 py-2 rounded-pill bg-dark-chassis hover:bg-black text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-2xs active:scale-95 min-h-[36px]"
                          >
                            <Play className="w-3.5 h-3.5 text-neon fill-neon" />
                            <span>Open in Studio</span>
                          </button>
                        ))}

                        <button
                          onClick={() => handleDeleteRun(run.id)}
                          className="p-2 rounded-full hover:bg-rose-50 text-txt-muted hover:text-rose-600 transition shrink-0"
                          title="Delete test run record from database"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Create Application Modal */}
      <CreateAppModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onAppCreated={async (newProj) => {
          await onRefreshProjects();
          onSelectProject(newProj.id);
        }}
      />
    </div>
  );
}
