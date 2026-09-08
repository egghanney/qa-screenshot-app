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
  Database
} from 'lucide-react';
import { Project, Feature, QATestRun } from '@/lib/types';
import { CreateAppModal } from './CreateAppModal';

interface AppsHubLandingViewProps {
  projects: Project[];
  features: Feature[];
  chartersCountByProject?: Record<string, number>;
  scenariosCountByProject?: Record<string, number>;
  onSelectProject: (projectId: string) => void;
  onRunAppCharters?: (project: Project) => void;
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
      <header className="bg-dark-chassis text-white border-b border-dark-secondary px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-neon text-dark-chassis flex items-center justify-center font-bold text-xs shadow-sm shadow-neon/40">
            QA
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold tracking-tight text-base text-white">
                AETHER <span className="text-neon">//</span> QA TEST STUDIO
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-dark-secondary text-txt-muted border border-dark-tertiary">
                APPS HUB
              </span>
            </div>
            <p className="text-[11px] text-txt-muted">
              Select an application workspace to view screen flows, journeys, and run test charters
            </p>
          </div>
        </div>

        {/* Global Action Tools */}
        <div className="flex items-center gap-2.5">
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="w-8 h-8 rounded-full bg-dark-secondary hover:bg-dark-tertiary text-txt-muted hover:text-white flex items-center justify-center transition border border-dark-tertiary"
              title="Settings & API Keys"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-pill bg-neon hover:bg-neon-bright text-dark-chassis text-xs font-bold transition shadow-card flex items-center gap-2 active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Application</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8">
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
        <div className="flex items-center justify-between gap-4 border-b border-qa-border pb-3">
          <div className="flex items-center gap-2 bg-qa-white p-1 rounded-pill border border-qa-border shadow-2xs">
            <button
              onClick={() => setHubTab('apps')}
              className={`px-4 py-1.5 rounded-pill text-xs font-bold transition flex items-center gap-2 ${
                hubTab === 'apps'
                  ? 'bg-dark-chassis text-white shadow-2xs'
                  : 'text-txt-muted hover:text-dark-chassis'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Applications ({projects.length})</span>
            </button>

            <button
              onClick={() => {
                setHubTab('runs');
                loadDbRuns();
              }}
              className={`px-4 py-1.5 rounded-pill text-xs font-bold transition flex items-center gap-2 ${
                hubTab === 'runs'
                  ? 'bg-dark-chassis text-white shadow-2xs'
                  : 'text-txt-muted hover:text-dark-chassis'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Run History ({dbRuns.length})</span>
            </button>
          </div>

          {hubTab === 'runs' && (
            <button
              onClick={loadDbRuns}
              disabled={isLoadingDbRuns}
              className="px-3.5 py-1.5 rounded-pill bg-qa-white hover:bg-qa-warm text-dark-chassis text-xs font-semibold border border-qa-border transition flex items-center gap-1.5 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDbRuns ? 'animate-spin' : ''}`} />
              <span>Refresh History</span>
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
                  className="w-full pl-9 pr-3 py-1.5 bg-qa-surface border border-qa-border rounded-xl text-xs focus:outline-none focus:border-dark-chassis placeholder:text-txt-muted transition"
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

                {/* View Mode Toggle: Grid vs List */}
                <div className="flex items-center gap-1 bg-qa-surface p-1 rounded-xl border border-qa-border">
                  <button
                    type="button"
                    onClick={() => handleSetViewMode('grid')}
                    className={`p-1.5 rounded-lg transition ${
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
                    className={`p-1.5 rounded-lg transition ${
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
              <div className="bg-qa-white rounded-2xl border border-qa-border shadow-xs overflow-hidden">
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
            ) : (
              <div className="space-y-3">
                {dbRuns.map((run) => {
                  const isCompleted = run.status === 'completed';
                  const featureNames = run.metadata?.featureNames || [];
                  const targetProj = projects.find(p => p.id === run.project_id);

                  return (
                    <div
                      key={run.id}
                      className="p-5 rounded-3xl bg-qa-white border border-qa-border hover:border-dark-chassis/40 shadow-xs hover:shadow-card transition flex flex-wrap items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5">
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

                        {featureNames.length > 0 && (
                          <p className="text-xs text-txt-secondary">
                            Features Tested: <strong className="text-dark-chassis">{featureNames.join(', ')}</strong>
                          </p>
                        )}

                        <div className="flex items-center gap-3 text-xs font-mono pt-1">
                          <span className="text-emerald-700 font-bold">{run.passed_count} Passed ({run.pass_rate}%)</span>
                          <span>•</span>
                          <span className="text-rose-700 font-bold">{run.failed_count} Failed</span>
                          <span>•</span>
                          <span className="text-amber-700 font-bold">{run.blocked_count} Blocked</span>
                          <span>•</span>
                          <span className="text-txt-muted">{run.untested_count} Untested</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        {targetProj && onRunAppCharters && (
                          <button
                            type="button"
                            onClick={() => onRunAppCharters(targetProj)}
                            className="px-4 py-2 rounded-pill bg-dark-chassis hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs active:scale-95"
                          >
                            <Play className="w-3.5 h-3.5 text-neon fill-neon" />
                            <span>Open in Studio</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteRun(run.id)}
                          className="p-2 rounded-full hover:bg-rose-50 text-txt-muted hover:text-rose-600 transition"
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
