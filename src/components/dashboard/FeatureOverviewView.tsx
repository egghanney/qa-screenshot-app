'use client';

import React from 'react';
import { 
  Feature, 
  ScreenItem, 
  KnowledgeItem, 
  QACheckpoint, 
  QAObservation, 
  AIQuestion 
} from '@/lib/types';
import { 
  Compass, 
  Layers, 
  GitCommit, 
  BookOpen, 
  HelpCircle, 
  CheckSquare, 
  AlertCircle, 
  Sparkles, 
  ArrowRight, 
  Smartphone, 
  ShieldCheck,
  Check,
  Trash2
} from 'lucide-react';

interface FeatureOverviewViewProps {
  feature: Feature;
  screens: ScreenItem[];
  knowledge: KnowledgeItem[];
  checkpoints: QACheckpoint[];
  observations: QAObservation[];
  questions: AIQuestion[];
  onNavigateTab: (tab: string) => void;
  onOpenWizard: () => void;
  onDeleteFeature?: () => void;
}

export function FeatureOverviewView({
  feature,
  screens,
  knowledge,
  checkpoints,
  observations,
  questions,
  onNavigateTab,
  onOpenWizard,
  onDeleteFeature
}: FeatureOverviewViewProps) {
  const pendingQuestions = questions.filter(q => q.status === 'Pending').length;
  const confirmedRules = knowledge.filter(k => k.confidence === 'CONFIRMED').length;
  const openBugs = observations.filter(o => o.status === 'Open').length;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
      
      {/* Top Clinical Feature Hero Banner */}
      <div className="bg-clinical-white rounded-[24px] p-6 border border-clinical-border shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-0.5 rounded-full bg-neon text-dark-chassis font-bold font-mono">
              v{feature.version}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-clinical-warm text-dark-chassis border border-clinical-border font-medium">
              {feature.platform}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-status-positive/20 text-dark-chassis border border-status-positive font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Living Knowledge Base Active
            </span>
          </div>

          <h1 className="text-2xl font-bold text-dark-chassis tracking-tight">
            {feature.name}
          </h1>

          <p className="text-xs text-txt-secondary leading-relaxed">
            {feature.description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigateTab('journey')}
            className="px-4 py-2 rounded-pill bg-dark-chassis hover:bg-dark-secondary text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
          >
            <GitCommit className="w-3.5 h-3.5" />
            Inspect Journey Map
          </button>
          <button
            onClick={() => onNavigateTab('knowledge')}
            className="px-4 py-2 rounded-pill bg-neon hover:bg-neon-bright text-dark-chassis text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            View 7 Knowledge Pillars
          </button>
          {onDeleteFeature && (
            <button
              onClick={() => {
                if (confirm(`Are you sure you want to delete feature "${feature.name}" and all its screens, journeys, and checkpoints from the database?`)) {
                  onDeleteFeature();
                }
              }}
              className="p-2 rounded-pill bg-clinical-warm hover:bg-status-critical/20 text-txt-muted hover:text-status-critical border border-clinical-border transition"
              title="Delete Feature from Database"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Screens Sequenced', val: screens.length, tab: 'screens', icon: Layers, highlight: false },
          { label: 'Knowledge Items', val: knowledge.length, tab: 'knowledge', icon: BookOpen, highlight: false },
          { label: 'Confirmed Rules', val: confirmedRules, tab: 'knowledge', icon: Check, highlight: true },
          { label: 'AI Gap Questions', val: pendingQuestions, tab: 'questions', icon: HelpCircle, highlight: pendingQuestions > 0 },
          { label: 'QA Checkpoints', val: checkpoints.length, tab: 'checkpoints', icon: CheckSquare, highlight: false },
          { label: 'Open Defects', val: openBugs, tab: 'defects', icon: AlertCircle, highlight: openBugs > 0 }
        ].map((m, i) => {
          const Icon = m.icon;
          return (
            <div
              key={i}
              onClick={() => onNavigateTab(m.tab)}
              className="bg-clinical-white p-4 rounded-2xl border border-clinical-border shadow-subtle hover:shadow-card cursor-pointer transition flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-txt-muted mb-2">
                <Icon className="w-4 h-4" />
                {m.highlight && <span className="w-2 h-2 rounded-full bg-neon" />}
              </div>
              <div>
                <div className="text-2xl font-bold text-dark-chassis font-mono">{m.val}</div>
                <div className="text-[11px] text-txt-secondary font-medium truncate">{m.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature Context Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Core Boundaries */}
        <div className="bg-clinical-white p-5 rounded-2xl border border-clinical-border shadow-subtle space-y-3">
          <h3 className="text-xs font-bold text-dark-chassis uppercase tracking-wider flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-dark-chassis" />
            Core Journey Boundaries
          </h3>

          <div className="space-y-2 text-xs">
            <div className="p-2.5 bg-clinical-warm rounded-xl border border-clinical-border">
              <span className="text-[10px] font-bold text-txt-secondary uppercase block">Entry Point:</span>
              <span className="font-semibold text-dark-chassis">{feature.entry_point}</span>
            </div>

            <div className="p-2.5 bg-clinical-warm rounded-xl border border-clinical-border">
              <span className="text-[10px] font-bold text-txt-secondary uppercase block">Expected Outcome:</span>
              <span className="font-semibold text-dark-chassis">{feature.expected_outcome}</span>
            </div>

            <div className="p-2.5 bg-clinical-warm rounded-xl border border-clinical-border">
              <span className="text-[10px] font-bold text-txt-secondary uppercase block">Primary Purpose:</span>
              <span className="text-dark-chassis">{feature.purpose}</span>
            </div>

            <div className="p-2.5 bg-clinical-warm rounded-xl border border-clinical-border">
              <span className="text-[10px] font-bold text-txt-secondary uppercase block">Target User Types:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {feature.user_types.map(u => (
                  <span key={u} className="px-2 py-0.5 rounded-full bg-clinical-white text-dark-chassis font-medium text-[10px] border border-clinical-border">
                    {u}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Knowledge & Rules */}
        <div className="bg-clinical-white p-5 rounded-2xl border border-clinical-border shadow-subtle space-y-3">
          <h3 className="text-xs font-bold text-dark-chassis uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-dark-chassis" />
            Pre-Supplied Context & Dependencies
          </h3>

          <div className="space-y-2 text-xs">
            {feature.advanced_context?.known_business_rules && (
              <div className="p-2.5 bg-clinical-warm rounded-xl border border-clinical-border">
                <span className="text-[10px] font-bold text-txt-secondary uppercase block">Known Business Rules:</span>
                <span className="text-dark-chassis">{feature.advanced_context.known_business_rules}</span>
              </div>
            )}

            {feature.advanced_context?.known_limitations && (
              <div className="p-2.5 bg-clinical-warm rounded-xl border border-clinical-border">
                <span className="text-[10px] font-bold text-txt-secondary uppercase block">Known Limitations:</span>
                <span className="text-dark-chassis">{feature.advanced_context.known_limitations}</span>
              </div>
            )}

            {feature.advanced_context?.known_dependencies && (
              <div className="p-2.5 bg-clinical-warm rounded-xl border border-clinical-border">
                <span className="text-[10px] font-bold text-txt-secondary uppercase block">Known Dependencies:</span>
                <span className="text-dark-chassis">{feature.advanced_context.known_dependencies}</span>
              </div>
            )}

            {feature.advanced_context?.known_apis && (
              <div className="p-2.5 bg-clinical-warm rounded-xl border border-clinical-border">
                <span className="text-[10px] font-bold text-txt-secondary uppercase block">Known APIs & Integrations:</span>
                <span className="text-dark-chassis font-mono text-[11px]">{feature.advanced_context.known_apis}</span>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
