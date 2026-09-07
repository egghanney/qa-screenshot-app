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
  Sparkles
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
  const [activeTab, setActiveTab] = useState<'evidence' | 'blueprint' | 'persona_risk' | 'dimensions' | 'quality_gate'>('evidence');

  if (!isOpen || !contextPack) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-clinical-surface rounded-[24px] border border-clinical-border shadow-modal max-w-4xl w-full max-h-[88vh] flex flex-col text-txt-primary overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-clinical-border bg-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-dark-chassis flex items-center justify-center text-neon">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-dark-chassis tracking-tight">
                  Evidence Context Pack &amp; Blueprint
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-neon/20 text-dark-chassis">
                  {featureName}
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

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 py-2 border-b border-clinical-border bg-clinical-warm text-xs font-medium overflow-x-auto">
          <button
            onClick={() => setActiveTab('evidence')}
            className={`px-3 py-1.5 rounded-pill flex items-center gap-1.5 transition ${
              activeTab === 'evidence'
                ? 'bg-dark-chassis text-white font-semibold shadow-xs'
                : 'text-txt-secondary hover:text-dark-chassis'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Visual Truth Layer ({contextPack.visual_evidence.length} Screens)
          </button>

          <button
            onClick={() => setActiveTab('blueprint')}
            className={`px-3 py-1.5 rounded-pill flex items-center gap-1.5 transition ${
              activeTab === 'blueprint'
                ? 'bg-dark-chassis text-white font-semibold shadow-xs'
                : 'text-txt-secondary hover:text-dark-chassis'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            8 Blueprint Dimensions
          </button>

          <button
            onClick={() => setActiveTab('persona_risk')}
            className={`px-3 py-1.5 rounded-pill flex items-center gap-1.5 transition ${
              activeTab === 'persona_risk'
                ? 'bg-dark-chassis text-white font-semibold shadow-xs'
                : 'text-txt-secondary hover:text-dark-chassis'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Persona &amp; Risk Chain
          </button>

          <button
            onClick={() => setActiveTab('dimensions')}
            className={`px-3 py-1.5 rounded-pill flex items-center gap-1.5 transition ${
              activeTab === 'dimensions'
                ? 'bg-dark-chassis text-white font-semibold shadow-xs'
                : 'text-txt-secondary hover:text-dark-chassis'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Exploration Matrix
          </button>

          {validationReport && (
            <button
              onClick={() => setActiveTab('quality_gate')}
              className={`px-3 py-1.5 rounded-pill flex items-center gap-1.5 transition ${
                activeTab === 'quality_gate'
                  ? 'bg-dark-chassis text-white font-semibold shadow-xs'
                  : 'text-txt-secondary hover:text-dark-chassis'
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white border border-clinical-border space-y-2">
                <h4 className="font-bold text-dark-chassis flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  1. Features &amp; Services
                </h4>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-700">
                  {contextPack.blueprint_dimensions.features.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-clinical-border space-y-2">
                <h4 className="font-bold text-dark-chassis flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  2. User Types
                </h4>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-700">
                  {contextPack.blueprint_dimensions.user_types.map((u, i) => (
                    <li key={i}>{u}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-clinical-border space-y-2">
                <h4 className="font-bold text-dark-chassis flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  3. Journeys &amp; Flow
                </h4>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-700">
                  {contextPack.blueprint_dimensions.journeys.map((j, i) => (
                    <li key={i}>{j}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-clinical-border space-y-2">
                <h4 className="font-bold text-dark-chassis flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  4. Interactions &amp; Controls
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {contextPack.blueprint_dimensions.interactions.map((it, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-slate-100 text-[10px] text-slate-700 font-mono">
                      {it}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-clinical-border space-y-2">
                <h4 className="font-bold text-dark-chassis flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  5. Business Rules &amp; Limits
                </h4>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-700">
                  {contextPack.blueprint_dimensions.business_rules.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-clinical-border space-y-2">
                <h4 className="font-bold text-dark-chassis flex items-center gap-1.5 text-rose-700">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  6. Failure States &amp; Timeouts
                </h4>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-700">
                  {contextPack.blueprint_dimensions.failure_states.map((fs, i) => (
                    <li key={i}>{fs}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-clinical-border space-y-2">
                <h4 className="font-bold text-dark-chassis flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                  7. External Dependencies &amp; APIs
                </h4>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-700">
                  {contextPack.blueprint_dimensions.dependencies.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-clinical-border space-y-2">
                <h4 className="font-bold text-dark-chassis flex items-center gap-1.5 text-amber-700">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  8. Historical Risks &amp; Defects
                </h4>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-700">
                  {contextPack.blueprint_dimensions.historical_risks.map((hr, i) => (
                    <li key={i}>{hr}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: PERSONA & RISK REASONING CHAIN */}
          {activeTab === 'persona_risk' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white border border-clinical-border space-y-2.5">
                <h4 className="font-bold text-dark-chassis flex items-center gap-1.5 text-xs">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  Controlled User Persona
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                  <div><strong className="text-slate-900">Persona Profile:</strong> {contextPack.persona.type} ({contextPack.persona.experience})</div>
                  <div><strong className="text-slate-900">Primary Objective:</strong> {contextPack.persona.goal}</div>
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <span className="font-semibold text-slate-900 text-[11px]">Real-World Conditions:</span>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-700 mt-1">
                    {contextPack.persona.conditions.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-clinical-border space-y-2.5">
                <h4 className="font-bold text-dark-chassis flex items-center gap-1.5 text-xs text-rose-700">
                  <ShieldAlert className="w-4 h-4" />
                  Reasoning Chain: States $\rightarrow$ Interruption Points $\rightarrow$ Risks
                </h4>
                <div className="space-y-2 text-[11px]">
                  <div>
                    <span className="font-semibold text-slate-900">Critical Flow Transitions:</span>
                    <p className="text-slate-600 font-mono mt-0.5">{contextPack.risk_profile.critical_states.join('  ⟶  ')}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">Known Interruption Traps:</span>
                    <ul className="list-disc list-inside text-slate-700 mt-0.5">
                      {contextPack.risk_profile.interruption_points.map((ip, i) => (
                        <li key={i}>{ip}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">High-Impact Failure Risks:</span>
                    <ul className="list-disc list-inside text-slate-700 mt-0.5">
                      {contextPack.risk_profile.key_risks.map((kr, i) => (
                        <li key={i}>{kr}</li>
                      ))}
                    </ul>
                  </div>
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
        <div className="px-6 py-3 border-t border-clinical-border bg-clinical-warm flex items-center justify-between text-xs text-txt-muted font-mono">
          <span>Evidence Pipeline: Active</span>
          <button 
            onClick={onClose}
            className="px-4 py-1.5 rounded-pill bg-dark-chassis text-white hover:bg-dark-black transition font-sans text-xs font-semibold"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
}
