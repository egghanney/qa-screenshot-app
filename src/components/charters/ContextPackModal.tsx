'use client';

import React, { useState } from 'react';
import { 
  X, 
  Layers, 
  Eye, 
  ShieldAlert, 
  UserCheck, 
  CheckCircle2, 
  XCircle, 
  Compass, 
  BookOpen,
  Sparkles,
  ChevronRight,
  Route,
  MousePointerClick,
  FileCheck,
  AlertTriangle,
  Cpu,
  History,
  Users
} from 'lucide-react';
import { ContextPack, ValidationReport } from '@/lib/types';

interface ContextPackModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextPack: ContextPack | null;
  validationReport?: ValidationReport | null;
  featureName?: string;
}

export function ContextPackModal({
  isOpen,
  onClose,
  contextPack,
  validationReport,
  featureName = 'Feature'
}: ContextPackModalProps) {
  const [activeTab, setActiveTab] = useState<'evidence' | 'blueprint' | 'persona_risk' | 'dimensions' | 'quality_gate'>('blueprint');

  if (!isOpen || !contextPack) return null;

  const cleanFeatureName = featureName?.trim() || 'Feature';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-dark-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-clinical-surface rounded-[24px] border border-clinical-border shadow-modal max-w-5xl xl:max-w-6xl w-full max-h-[90vh] flex flex-col text-txt-primary overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-clinical-border bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-dark-chassis flex items-center justify-center text-neon shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-dark-chassis tracking-tight">
                  Evidence Context Pack &amp; Blueprint
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-neon/20 text-dark-chassis border border-neon/30">
                  {cleanFeatureName}
                </span>
              </div>
              <p className="text-xs text-txt-muted">
                Controlled evidence pipeline feeding the Charter Generation Agent.
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-txt-muted hover:text-dark-chassis transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs (Pill style with no-scrollbar) */}
        <div className="flex items-center gap-1.5 px-6 py-2.5 border-b border-clinical-border bg-clinical-warm text-xs font-medium overflow-x-auto no-scrollbar shrink-0">
          <button
            onClick={() => setActiveTab('blueprint')}
            className={`px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shrink-0 transition ${
              activeTab === 'blueprint'
                ? 'bg-dark-chassis text-white font-semibold shadow-xs'
                : 'bg-white hover:bg-slate-50 text-dark-secondary hover:text-dark-chassis border border-clinical-border shadow-2xs'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            8 Blueprint Dimensions
          </button>

          <button
            onClick={() => setActiveTab('evidence')}
            className={`px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shrink-0 transition ${
              activeTab === 'evidence'
                ? 'bg-dark-chassis text-white font-semibold shadow-xs'
                : 'bg-white hover:bg-slate-50 text-dark-secondary hover:text-dark-chassis border border-clinical-border shadow-2xs'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Visual Truth Layer ({contextPack.visual_evidence.length} Screens)
          </button>

          <button
            onClick={() => setActiveTab('persona_risk')}
            className={`px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shrink-0 transition ${
              activeTab === 'persona_risk'
                ? 'bg-dark-chassis text-white font-semibold shadow-xs'
                : 'bg-white hover:bg-slate-50 text-dark-secondary hover:text-dark-chassis border border-clinical-border shadow-2xs'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Persona &amp; Risk Chain
          </button>

          <button
            onClick={() => setActiveTab('dimensions')}
            className={`px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shrink-0 transition ${
              activeTab === 'dimensions'
                ? 'bg-dark-chassis text-white font-semibold shadow-xs'
                : 'bg-white hover:bg-slate-50 text-dark-secondary hover:text-dark-chassis border border-clinical-border shadow-2xs'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Exploration Matrix
          </button>

          {validationReport && (
            <button
              onClick={() => setActiveTab('quality_gate')}
              className={`px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shrink-0 transition ${
                activeTab === 'quality_gate'
                  ? 'bg-dark-chassis text-white font-semibold shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-dark-secondary hover:text-dark-chassis border border-clinical-border shadow-2xs'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Quality Gate ({validationReport.score}%)
            </button>
          )}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 text-xs space-y-4 leading-relaxed">
          
          {/* TAB 1: VISUAL TRUTH LAYER */}
          {activeTab === 'evidence' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/70 text-indigo-950 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-xs">
                  <Eye className="w-4 h-4 text-indigo-700" />
                  Visual Evidence Policy
                </div>
                <p className="text-[11px] leading-relaxed text-indigo-900/80">
                  Screenshots are treated as <strong>empirical evidence</strong>, not assumptions or click instructions. 
                  Factual elements are confirmed; uncertain transitions are tagged for tester investigation.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {contextPack.visual_evidence.map((screen, sIdx) => (
                  <div key={sIdx} className="p-4 rounded-2xl bg-white border border-clinical-border shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between border-b border-clinical-border pb-2">
                      <span className="font-bold text-dark-chassis text-xs">
                        {screen.screen_name}
                      </span>
                      <span className="font-mono text-[10px] text-txt-muted">
                        {screen.screen_id}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {screen.visual_observations.map((obs, oIdx) => (
                        <div key={oIdx} className="flex items-start gap-1.5 text-[11px]">
                          {obs.confidence === 'confirmed' ? (
                            <span className="shrink-0 px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800">
                              CONFIRMED
                            </span>
                          ) : (
                            <span className="shrink-0 px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-100 text-amber-800">
                              INVESTIGATE
                            </span>
                          )}
                          <span className="text-slate-700">{obs.fact}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: 8 BLUEPRINT DIMENSIONS */}
          {activeTab === 'blueprint' && (
            <div className="space-y-4">
              {/* Quick Dimension Navigation & Status Ribbon */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/70 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                <div className="flex items-center gap-2 text-indigo-950 font-bold">
                  <BookOpen className="w-4 h-4 text-indigo-700" />
                  <span>8 Verified Blueprint Dimensions</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-100 text-indigo-800 border border-indigo-300">
                    Active &amp; Grounded
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium text-slate-600">
                  <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 shadow-2xs">1. Features</span>
                  <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 shadow-2xs">2. Users</span>
                  <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 shadow-2xs">3. Journeys</span>
                  <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 shadow-2xs">4. Controls</span>
                  <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 shadow-2xs">5. Rules</span>
                  <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 shadow-2xs">6. Failures</span>
                  <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 shadow-2xs">7. APIs</span>
                  <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 shadow-2xs">8. Risks</span>
                </div>
              </div>

              {/* 8 Dimension Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* 1. Features & Services */}
                <div className="p-4 rounded-2xl bg-white border border-clinical-border shadow-xs space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="font-bold text-dark-chassis flex items-center gap-2 text-xs">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-mono font-bold">1</span>
                      Features &amp; Services
                    </h4>
                    <span className="text-[10px] text-txt-muted font-mono">{contextPack.blueprint_dimensions.features.length} items</span>
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-slate-700">
                    {contextPack.blueprint_dimensions.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 2. User Types */}
                <div className="p-4 rounded-2xl bg-white border border-clinical-border shadow-xs space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="font-bold text-dark-chassis flex items-center gap-2 text-xs">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-mono font-bold">2</span>
                      User Types &amp; Personas
                    </h4>
                    <span className="text-[10px] text-txt-muted font-mono">{contextPack.blueprint_dimensions.user_types.length} types</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {contextPack.blueprint_dimensions.user_types.map((u, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-medium">
                        <Users className="w-3 h-3 text-emerald-600" /> {u}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 3. Journeys & Flow */}
                <div className="p-4 rounded-2xl bg-white border border-clinical-border shadow-xs space-y-2 md:col-span-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="font-bold text-dark-chassis flex items-center gap-2 text-xs">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-mono font-bold">3</span>
                      Journeys &amp; Screen Flow
                    </h4>
                    <span className="text-[10px] text-indigo-600 font-mono font-medium">Sequential Transition Flow</span>
                  </div>
                  
                  {contextPack.blueprint_dimensions.journeys.map((j, i) => {
                    const steps = j.includes(' → ') 
                      ? j.split(' → ').map(s => s.trim()).filter(Boolean)
                      : [j];

                    return (
                      <div key={i} className="flex flex-wrap items-center gap-1.5 pt-1">
                        {steps.map((step, sIdx) => (
                          <React.Fragment key={sIdx}>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-900 border border-indigo-200/80 text-[11px] font-medium shadow-xs">
                              <span className="w-4 h-4 rounded-full bg-indigo-200/80 text-indigo-800 text-[9px] font-mono font-bold flex items-center justify-center shrink-0">
                                {sIdx + 1}
                              </span>
                              {step}
                            </span>
                            {sIdx < steps.length - 1 && (
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    );
                  })}
                </div>

                {/* 4. Interactions & Controls */}
                <div className="p-4 rounded-2xl bg-white border border-clinical-border shadow-xs space-y-2 md:col-span-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="font-bold text-dark-chassis flex items-center gap-2 text-xs">
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-mono font-bold">4</span>
                      Key Interactions &amp; UI Controls
                    </h4>
                    <span className="text-[10px] text-txt-muted font-mono">{contextPack.blueprint_dimensions.interactions.length} controls</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {contextPack.blueprint_dimensions.interactions.map((it, i) => {
                      const isButton = /button/i.test(it);
                      const isInput = /text_field|input/i.test(it);
                      const isNav = /navigation|back/i.test(it);
                      
                      return (
                        <span key={i} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
                          isButton 
                            ? 'bg-amber-50 text-amber-900 border-amber-200'
                            : isInput
                            ? 'bg-blue-50 text-blue-900 border-blue-200'
                            : isNav
                            ? 'bg-slate-100 text-slate-800 border-slate-300'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isButton ? 'bg-amber-500' : isInput ? 'bg-blue-500' : 'bg-slate-400'
                          }`} />
                          {it}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Business Rules & Limits */}
                <div className="p-4 rounded-2xl bg-white border border-clinical-border shadow-xs space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="font-bold text-dark-chassis flex items-center gap-2 text-xs">
                      <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-mono font-bold">5</span>
                      Business Rules &amp; Constraints
                    </h4>
                    <span className="text-[10px] text-txt-muted font-mono">{contextPack.blueprint_dimensions.business_rules.length} rules</span>
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-slate-700">
                    {contextPack.blueprint_dimensions.business_rules.map((b, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 6. Failure States & Timeouts */}
                <div className="p-4 rounded-2xl bg-white border border-clinical-border shadow-xs space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="font-bold text-dark-chassis flex items-center gap-2 text-xs text-rose-700">
                      <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-[10px] font-mono font-bold">6</span>
                      Failure States &amp; Timeouts
                    </h4>
                    <span className="text-[10px] text-rose-600 font-mono">{contextPack.blueprint_dimensions.failure_states.length} states</span>
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-slate-700">
                    {contextPack.blueprint_dimensions.failure_states.map((fs, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                        <span>{fs}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 7. External Dependencies & APIs */}
                <div className="p-4 rounded-2xl bg-white border border-clinical-border shadow-xs space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="font-bold text-dark-chassis flex items-center gap-2 text-xs">
                      <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-[10px] font-mono font-bold">7</span>
                      External Dependencies &amp; APIs
                    </h4>
                    <span className="text-[10px] text-txt-muted font-mono">{contextPack.blueprint_dimensions.dependencies.length} deps</span>
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-slate-700">
                    {contextPack.blueprint_dimensions.dependencies.map((d, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5 shrink-0" />
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 8. Historical Risks & Defects */}
                <div className="p-4 rounded-2xl bg-white border border-clinical-border shadow-xs space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="font-bold text-dark-chassis flex items-center gap-2 text-xs text-amber-800">
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-[10px] font-mono font-bold">8</span>
                      Historical Risks &amp; Defects
                    </h4>
                    <span className="text-[10px] text-amber-700 font-mono">{contextPack.blueprint_dimensions.historical_risks.length} risks</span>
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-slate-700">
                    {contextPack.blueprint_dimensions.historical_risks.map((hr, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                        <span>{hr}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}


          {/* TAB 4: EXPLORATION DIMENSIONS */}
          {activeTab === 'dimensions' && (
            <div className="space-y-3">
              <p className="text-xs text-txt-muted leading-relaxed">
                The agent evaluates and prioritizes exploration dimensions specifically tailored to this feature's risk profile:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {contextPack.exploration_dimensions.map((dim, idx) => {
                  const priorityColors = {
                    HIGH: 'bg-rose-50 text-rose-700 border-rose-200',
                    MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
                    LOW: 'bg-slate-50 text-slate-600 border-slate-200'
                  };
                  return (
                    <div key={idx} className="p-3.5 rounded-2xl bg-white border border-clinical-border space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-dark-chassis text-xs">
                          {dim.dimension}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border font-mono ${priorityColors[dim.priority]}`}>
                          {dim.priority} PRIORITY
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {dim.rationale}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: QUALITY GATE VALIDATION REPORT */}
          {activeTab === 'quality_gate' && validationReport && (
            <div className="space-y-4">
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                validationReport.passed 
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' 
                  : 'bg-amber-50/80 border-amber-200 text-amber-900'
              }`}>
                <div className="space-y-1">
                  <div className="font-bold text-sm flex items-center gap-1.5">
                    {validationReport.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-amber-600" />
                    )}
                    Charter Quality Gate: {validationReport.passed ? 'PASSED' : 'FLAGGED FOR REVIEW'}
                  </div>
                  <p className="text-xs opacity-90">{validationReport.notes}</p>
                </div>
                <div className="text-right font-mono">
                  <span className="text-2xl font-bold">{validationReport.score}%</span>
                  <div className="text-[10px] uppercase tracking-wider font-semibold">Audit Score</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(validationReport.checks).map(([checkKey, passed], idx) => {
                  const isNegativeCheck = checkKey === 'duplicate_prompts' || checkKey === 'unsupported_claims';
                  const isSuccess = isNegativeCheck ? !passed : !!passed;
                  
                  const label = checkKey === 'duplicate_prompts'
                    ? 'No Duplicate Prompts'
                    : checkKey === 'unsupported_claims'
                    ? 'No Unsupported Claims'
                    : checkKey === 'positive_golden_flow_covered'
                    ? 'Positive Golden Flow Covered'
                    : checkKey.replace(/_/g, ' ');

                  return (
                    <div key={idx} className="p-3 rounded-xl bg-white border border-clinical-border flex items-center justify-between text-xs">
                      <span className="font-mono text-[11px] text-slate-700 capitalize">
                        {label}
                      </span>
                      {isSuccess ? (
                        <span className="text-emerald-600 font-bold flex items-center gap-1 text-[10px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> PASSED
                        </span>
                      ) : (
                        <span className="text-rose-600 font-bold flex items-center gap-1 text-[10px]">
                          <XCircle className="w-3.5 h-3.5" /> FAILED
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-clinical-border bg-white flex items-center justify-between text-xs text-txt-muted font-mono shrink-0">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-dark-chassis">6-Level Evidence Pipeline</span> · 8 Dimensions Grounded · Deterministic IDs Active
          </span>
          <button 
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-dark-chassis text-white hover:bg-dark-black transition font-sans text-xs font-semibold shadow-xs"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
}
