'use client';

import React, { useState } from 'react';
import { 
  Compass, 
  Layers, 
  GitCommit, 
  BookOpen, 
  HelpCircle, 
  CheckSquare, 
  AlertCircle, 
  GitCompare, 
  Download, 
  Sparkles, 
  Plus, 
  Search, 
  Settings, 
  Smartphone,
  ChevronRight
} from 'lucide-react';
import { Project, Feature } from '@/lib/types';

interface ApplicationShellProps {
  currentProject: Project | null;
  currentFeature: Feature | null;
  allFeatures?: Feature[];
  onSelectFeature?: (id: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenWizard: () => void;
  onOpenSettings: () => void;
  onToggleChat: () => void;
  isChatOpen: boolean;
  onSearchQuery?: (q: string) => void;
  children: React.ReactNode;
  counts?: {
    screens: number;
    nodes: number;
    knowledge: number;
    questions: number;
    checkpoints: number;
    observations: number;
  };
}

export function ApplicationShell({
  currentProject,
  currentFeature,
  allFeatures = [],
  onSelectFeature,
  activeTab,
  setActiveTab,
  onOpenWizard,
  onOpenSettings,
  onToggleChat,
  isChatOpen,
  onSearchQuery,
  children,
  counts = { screens: 0, nodes: 0, knowledge: 0, questions: 0, checkpoints: 0, observations: 0 }
}: ApplicationShellProps) {
  const [searchVal, setSearchVal] = useState('');

  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: Compass },
    { id: 'screens', label: 'Screens', icon: Layers, badge: counts.screens },
    { id: 'journey', label: 'Journey Map', icon: GitCommit, badge: counts.nodes },
    { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen, badge: counts.knowledge },
    { id: 'questions', label: 'AI Questions', icon: HelpCircle, badge: counts.questions, highlight: counts.questions > 0 },
    { id: 'checkpoints', label: 'QA Matrix', icon: CheckSquare, badge: counts.checkpoints },
    { id: 'defects', label: 'Defects & Gaps', icon: AlertCircle, badge: counts.observations },
    { id: 'compare', label: 'Screen Diff', icon: GitCompare },
    { id: 'export', label: 'Export Studio', icon: Download },
  ];

  return (
    <div className="min-h-screen h-screen max-h-screen p-2 sm:p-4 bg-clinical-bg flex flex-col overflow-hidden">
      {/* Outer Charcoal Framing with Rounded 32px */}
      <div className="w-full bg-dark-chassis rounded-[32px] p-2 sm:p-3 shadow-2xl flex flex-col flex-1 border border-dark-secondary/60 min-h-0 overflow-hidden">
        
        {/* Top Header Bar */}
        <header className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-white border-b border-dark-secondary/80">
          
          {/* Left: Brand + Clinical Status + Breadcrumbs */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-neon flex items-center justify-center text-dark-chassis font-bold text-xs shadow-sm shadow-neon/40">
                QA
              </div>
              <span className="font-semibold tracking-tight text-sm text-white">
                AETHER <span className="text-neon">//</span> OS
              </span>
            </div>

            <div className="h-4 w-px bg-dark-tertiary hidden sm:block" />

            {/* Project / Feature Breadcrumbs */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="px-2.5 py-1 rounded-pill bg-dark-secondary text-txt-muted hover:text-white transition flex items-center gap-1">
                <Smartphone className="w-3 h-3" />
                {currentProject?.name || 'Active Project'}
              </span>
              <ChevronRight className="w-3 h-3 text-txt-muted" />

              {allFeatures.length > 1 && onSelectFeature ? (
                <select
                  value={currentFeature?.id || ''}
                  onChange={(e) => onSelectFeature(e.target.value)}
                  className="px-2.5 py-1 rounded-pill bg-dark-tertiary text-white font-medium text-xs border border-dark-secondary focus:outline-none focus:border-neon cursor-pointer"
                >
                  {allFeatures.map(f => (
                    <option key={f.id} value={f.id} className="bg-dark-chassis text-white">
                      {f.name} (v{f.version || '1.0'})
                    </option>
                  ))}
                </select>
              ) : (
                <span className="px-2.5 py-1 rounded-pill bg-dark-tertiary text-white font-medium flex items-center gap-1">
                  {currentFeature?.name || 'No Active Feature'}
                  {currentFeature?.version && (
                    <span className="text-[10px] text-neon ml-1 px-1 py-0.2 bg-dark-chassis/60 rounded font-mono">
                      v{currentFeature.version}
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Center: Search Pill */}
          <div className="flex-1 max-w-xs relative hidden md:block">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-txt-muted" />
            <input
              type="text"
              placeholder="Search features, rules, checkpoints... (⌘K)"
              value={searchVal}
              onChange={(e) => {
                setSearchVal(e.target.value);
                onSearchQuery?.(e.target.value);
              }}
              className="w-full bg-dark-secondary/80 text-xs text-white placeholder:text-txt-muted rounded-pill pl-9 pr-4 py-1.5 border border-dark-tertiary focus:outline-none focus:border-neon transition"
            />
          </div>

          {/* Right: Copilot Pill + Settings + Create Feature CTA */}
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleChat}
              className={`px-3 py-1.5 rounded-pill text-xs font-medium flex items-center gap-1.5 transition border ${
                isChatOpen 
                  ? 'bg-neon text-dark-chassis border-neon shadow-sm shadow-neon/30 font-semibold' 
                  : 'bg-dark-secondary text-white border-dark-tertiary hover:bg-dark-tertiary'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Ask AI Copilot
            </button>

            <button
              onClick={onOpenSettings}
              className="w-8 h-8 rounded-full bg-dark-secondary border border-dark-tertiary flex items-center justify-center text-txt-muted hover:text-white transition"
              title="System Settings & API Keys"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onOpenWizard}
              className="px-3.5 py-1.5 rounded-pill bg-neon hover:bg-neon-bright text-dark-chassis text-xs font-semibold flex items-center gap-1.5 transition shadow-sm active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              New Feature
            </button>
          </div>
        </header>

        {/* Secondary Navigation Pill Bar */}
        <nav className="px-4 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-dark-secondary/60 bg-dark-chassis">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3.5 py-1.5 rounded-pill text-xs font-medium flex items-center gap-2 whitespace-nowrap shrink-0 transition-all ${
                  isActive
                    ? 'bg-clinical-warm text-dark-chassis font-semibold shadow-sm'
                    : 'text-txt-muted hover:text-white hover:bg-dark-secondary'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-dark-chassis' : 'text-txt-muted'}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono leading-none ${
                      isActive
                        ? 'bg-dark-chassis text-white'
                        : item.highlight
                        ? 'bg-neon text-dark-chassis font-bold'
                        : 'bg-dark-secondary text-txt-muted'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Inner Clinical Workspace Surface (Warm Neutral Ivory #F4F3EE) */}
        <main className="flex-1 bg-clinical-warm rounded-[24px] overflow-hidden flex flex-col relative m-1 border border-clinical-border min-h-0">
          {children}
        </main>
      </div>
    </div>
  );
}
