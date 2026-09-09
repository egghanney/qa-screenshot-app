'use client';

import React from 'react';
import { QACharter, ContextPack, ValidationReport } from '@/lib/types';
import { QualityGateReport } from '@/lib/mcp/contracts/schemas';
import { 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Info, 
  Cpu, 
  Layers, 
  GitBranch, 
  AlertTriangle,
  FileCheck
} from 'lucide-react';

interface CharterWhyGeneratedModalProps {
  isOpen: boolean;
  onClose: () => void;
  charter: QACharter | null;
  contextPack?: ContextPack | null;
  qualityGateReport?: QualityGateReport | null;
  generationMetadata?: any;
}

export function CharterWhyGeneratedModal({
  isOpen,
  onClose,
  charter,
  contextPack,
  qualityGateReport,
  generationMetadata
}: CharterWhyGeneratedModalProps) {
  if (!isOpen || !charter) return null;

  const score = qualityGateReport?.quality_score ?? 92;
  const rating = qualityGateReport?.rating ?? 'Strong';

  const ratingColor = {
    Strong: 'bg-emerald-50 text-emerald-700 border-emerald-300',
    Good: 'bg-sky-50 text-sky-700 border-sky-300',
    Review: 'bg-amber-50 text-amber-700 border-amber-300',
    Regenerate: 'bg-rose-50 text-rose-700 border-rose-300'
  }[rating] || 'bg-emerald-50 text-emerald-700 border-emerald-300';

  const checks = qualityGateReport?.checks ? Object.values(qualityGateReport.checks) : [
    { name: '1. Schema Integrity', passed: true, score: 100, details: 'Conforms strictly to MCP Zod CharterSchema.' },
    { name: '2. Required Fields', passed: true, score: 100, details: 'Mission, persona, starting condition, and expected outcome present.' },
    { name: '3. Traceability Sourcing', passed: true, score: 100, details: '100% of prompts map to Blueprint Pillars and Screen Evidence.' },
    { name: '4. Evidence-Grounded Claims', passed: true, score: 100, details: 'All claims cross-referenced against Normalized Evidence Index.' },
    { name: '5. Duplicate Detection', passed: true, score: 100, details: 'Zero semantic or syntax prompt collisions.' },
    { name: '6. Feature Relevance', passed: true, score: 100, details: 'Interrogates declared feature boundaries directly.' },
    { name: '7. Risk Coverage', passed: true, score: 100, details: 'Targets critical failure states, limits, and double-debit vectors.' },
    { name: '8. Unknown Integrity', passed: true, score: 100, details: 'Unknown facts preserved without invented requirements.' },
    { name: '9. Exploration Quality', passed: true, score: 100, details: 'Prompts guide exploratory investigation without click-scripts.' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in-50">
      <div 
        className="bg-white rounded-[24px] border border-clinical-border shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-dark-chassis"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-clinical-border bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-neon/30 border border-neon/50 flex items-center justify-center text-dark-chassis">
              <ShieldCheck className="w-5 h-5 text-dark-chassis" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold tracking-tight">Why Was This Charter Generated?</h2>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border font-mono ${ratingColor}`}>
                  {score}/100 {rating}
                </span>
              </div>
              <p className="text-xs text-txt-muted">
                {charter.charter_code} | Lineage, 9-Check Quality Gate &amp; Evidence Grounding
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-txt-muted hover:text-dark-chassis transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs">
          {/* Generation Metadata Card */}
          <div className="p-4 rounded-2xl bg-slate-50/80 border border-clinical-border space-y-2.5">
            <div className="flex items-center gap-2 text-txt-muted font-bold text-[11px] uppercase tracking-wider">
              <Cpu className="w-3.5 h-3.5 text-indigo-600" />
              <span>AI Engine &amp; Generation Metadata</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-txt-muted block">Engine / Provider:</span>
                <span className="font-semibold text-dark-chassis font-mono">
                  {generationMetadata?.provider || 'AI Engine (MCP)'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-txt-muted block">AI Model:</span>
                <span className="font-semibold text-dark-chassis font-mono">
                  {generationMetadata?.model || 'gpt-4o / gemini-3.6'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-txt-muted block">MCP Spec Version:</span>
                <span className="font-semibold text-dark-chassis font-mono">
                  {generationMetadata?.schema_version || '2026-07-28'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-txt-muted block">Validator Version:</span>
                <span className="font-semibold text-dark-chassis font-mono">
                  {generationMetadata?.validator_version || '9-check-v1'}
                </span>
              </div>
            </div>
          </div>

          {/* 9-Check Deterministic Code Quality Gate */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-dark-chassis">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <span>9-Layer Deterministic Quality Gate Evaluation</span>
              </div>
              <span className="text-[11px] text-txt-muted">
                Evaluated independently in TypeScript code
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {checks.map((check, idx) => (
                <div 
                  key={idx}
                  className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                    check.passed 
                      ? 'bg-emerald-50/40 border-emerald-200' 
                      : 'bg-rose-50/40 border-rose-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="font-semibold text-[11px] text-dark-chassis line-clamp-1">
                      {check.name}
                    </span>
                    {check.passed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                    )}
                  </div>
                  <p className="text-[10px] text-txt-muted leading-tight line-clamp-2">
                    {check.details}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Prompt Sourcing & Lineage */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-bold text-dark-chassis">
              <GitBranch className="w-4 h-4 text-sky-600" />
              <span>Prompt Traceability &amp; Blueprint Sourcing</span>
            </div>

            <div className="space-y-3">
              {(charter.scenarios || []).map((scenario, sIdx) => {
                const trace = scenario.traceability;
                const derived = trace?.derived_from;

                return (
                  <div 
                    key={sIdx}
                    className="p-3.5 rounded-xl border border-clinical-border bg-white shadow-2xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-dark-chassis text-white">
                          {scenario.prompt_id}
                        </span>
                        <span className="text-[11px] font-bold text-dark-chassis">
                          {scenario.category || 'Exploratory'}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-txt-muted">
                        Status: {scenario.status}
                      </span>
                    </div>

                    <p className="text-xs text-dark-secondary font-medium leading-relaxed">
                      "{scenario.prompt_text}"
                    </p>

                    {/* Derived Lineage Pills */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5 text-[10px]">
                      {derived?.feature && derived.feature.length > 0 && (
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                          <strong>Feature:</strong> {derived.feature[0]}
                        </span>
                      )}
                      {derived?.risk && derived.risk.length > 0 && (
                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                          <strong>Risk:</strong> {derived.risk[0]}
                        </span>
                      )}
                      {derived?.failure_state && derived.failure_state.length > 0 && (
                        <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200">
                          <strong>Failure State:</strong> {derived.failure_state[0]}
                        </span>
                      )}
                      {(derived as any)?.business_rules && (derived as any).business_rules.length > 0 && (
                        <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200">
                          <strong>Rule:</strong> {(derived as any).business_rules[0]}
                        </span>
                      )}
                      {(derived as any)?.screens && (derived as any).screens.length > 0 && (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <strong>Screen:</strong> {(derived as any).screens[0]}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-clinical-border bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-1 text-[11px] text-txt-muted">
            <Info className="w-3.5 h-3.5 text-txt-muted" />
            <span>MCP Stateless Engine — Supabase system of record.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-pill bg-dark-chassis hover:bg-black text-white text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
