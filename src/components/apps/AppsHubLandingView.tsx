'use client';

import React, { useState, useMemo } from 'react';
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
  ExternalLink
} from 'lucide-react';
import { Project, Feature } from '@/lib/types';
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
            <span className="text-[11px] font-mono uppercase tracking-wider text-txt-muted block">Test Model</span>
            <div className="flex items-baseline gap-1.5 pt-0.5">
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                360° Coverage
              </span>
            </div>
          </div>
        </div>

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

          {/* Platform Filter Buttons */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
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
        </div>

        {/* Applications Grid */}
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
                className="px-5 py-2.5 rounded-pill bg-neon hover:bg-neon-bright text-dark-chassis text-xs font-bold transition shadow-card inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                Register First Application
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProjects.map(proj => {
              const projFeatures = featuresByProject[proj.id] || [];
              const charterCount = chartersCountByProject[proj.id] || 0;
              const scenarioCount = scenariosCountByProject[proj.id] || 0;

              return (
                <div 
                  key={proj.id}
                  className="bg-qa-white rounded-3xl border border-qa-border shadow-card hover:shadow-floating hover:border-dark-chassis/40 transition-all p-5 flex flex-col justify-between space-y-4 group"
                >
                  {/* Card Top */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-dark-chassis text-white flex items-center justify-center shrink-0 shadow-sm group-hover:bg-dark-secondary transition">
                          {getPlatformIcon(proj.platform)}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-dark-chassis group-hover:text-black transition">
                            {proj.name}
                          </h3>
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-txt-muted uppercase">
                            {proj.platform || 'General'}
                          </span>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-qa-surface text-txt-secondary border border-qa-border shrink-0">
                        {projFeatures.length} {projFeatures.length === 1 ? 'Feature' : 'Features'}
                      </span>
                    </div>

                    <p className="text-xs text-txt-secondary line-clamp-2 min-h-[32px] leading-relaxed">
                      {proj.description || 'Application workspace ready for exploratory testing and visual journey mapping.'}
                    </p>
                  </div>

                  {/* Feature Tags Preview */}
                  {projFeatures.length > 0 && (
                    <div className="pt-2 border-t border-qa-border/60">
                      <span className="text-[10px] font-mono uppercase text-txt-muted block mb-1.5">
                        Features in this app:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {projFeatures.slice(0, 3).map(f => (
                          <span 
                            key={f.id}
                            className="px-2 py-0.5 rounded-lg bg-qa-warm text-dark-chassis text-[10px] font-medium border border-qa-border truncate max-w-[140px]"
                          >
                            {f.name}
                          </span>
                        ))}
                        {projFeatures.length > 3 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] text-txt-muted font-mono">
                            +{projFeatures.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Metrics & Execution Bar */}
                  <div className="pt-3 border-t border-qa-border flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-dark-chassis">
                        <ClipboardList className="w-3.5 h-3.5 text-indigo-600" />
                        {charterCount} Charters
                      </span>
                      {scenarioCount > 0 && (
                        <span className="text-[10px] text-txt-muted font-mono">
                          ({scenarioCount} Scenarios)
                        </span>
                      )}
                    </div>

                    {charterCount > 0 && onRunAppCharters && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRunAppCharters(proj);
                        }}
                        className="px-2.5 py-1 rounded-pill bg-dark-chassis hover:bg-dark-secondary text-neon text-[11px] font-bold transition flex items-center gap-1 shadow-2xs active:scale-95"
                        title="Run all exploratory charters under this application"
                      >
                        <Play className="w-3 h-3 fill-neon" />
                        <span>Run Suite</span>
                      </button>
                    )}
                  </div>

                  {/* Primary Enter Action */}
                  <button
                    onClick={() => onSelectProject(proj.id)}
                    className="w-full py-2.5 rounded-2xl bg-qa-warm group-hover:bg-neon text-dark-chassis text-xs font-bold transition flex items-center justify-center gap-2 border border-qa-border group-hover:border-neon shadow-2xs active:scale-98"
                  >
                    <span>Open Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              );
            })}
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
