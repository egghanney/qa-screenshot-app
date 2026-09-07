'use client';

import React, { useState } from 'react';
import { ScreenItem, Feature, ScreenComparison } from '@/lib/types';
import { 
  GitCompare, 
  Sparkles, 
  ArrowRight, 
  Check, 
  AlertTriangle, 
  MinusCircle, 
  PlusCircle, 
  RefreshCw 
} from 'lucide-react';

interface ScreenComparisonStudioProps {
  screens: ScreenItem[];
  feature: Feature;
}

export function ScreenComparisonStudio({ screens, feature }: ScreenComparisonStudioProps) {
  const [screenAId, setScreenAId] = useState<string>(screens[0]?.id || '');
  const [screenBId, setScreenBId] = useState<string>(screens[1]?.id || screens[0]?.id || '');
  const [isComparing, setIsComparing] = useState(false);
  const [diffResult, setDiffResult] = useState<ScreenComparison['detected_changes'] & { diff_summary: string } | null>(null);

  const screenA = screens.find(s => s.id === screenAId) || screens[0];
  const screenB = screens.find(s => s.id === screenBId) || screens[1] || screens[0];

  if (screens.length < 2) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-clinical-bg">
        <div className="bg-clinical-white p-10 rounded-2xl border border-clinical-border shadow-subtle max-w-md space-y-3">
          <GitCompare className="w-8 h-8 text-txt-muted mx-auto opacity-40" />
          <h4 className="text-sm font-bold text-dark-chassis">Minimum 2 Screens Required</h4>
          <p className="text-xs text-txt-secondary">
            Upload at least 2 screenshots for this feature to run visual regression diffing and state comparison.
          </p>
        </div>
      </div>
    );
  }

  const handleRunComparison = async () => {
    if (!screenA || !screenB) return;
    setIsComparing(true);
    try {
      const res = await fetch('/api/screens/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature_id: feature.id,
          screen_a_id: screenA.id,
          screen_b_id: screenB.id
        })
      });

      const data = await res.json();
      if (data.comparison) {
        setDiffResult(data.comparison.detected_changes || data.comparison);
      }
    } catch (err) {
      console.error('Comparison failed:', err);
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-4 sm:p-6 space-y-4">
      
      {/* Top Banner */}
      <div className="bg-clinical-white p-4 rounded-2xl border border-clinical-border shadow-subtle flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-neon animate-pulse" />
          <div>
            <h3 className="text-xs font-bold text-dark-chassis tracking-tight">
              SCREEN COMPARISON & REGRESSION DIFF STUDIO
            </h3>
            <p className="text-[11px] text-txt-secondary">
              Analyze structural UI alterations, text discrepancies, and state mutations between any two screens.
            </p>
          </div>
        </div>

        <button
          onClick={handleRunComparison}
          disabled={isComparing}
          className="px-5 py-2 rounded-pill bg-neon hover:bg-neon-bright text-dark-chassis text-xs font-bold shadow-card flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {isComparing ? 'Analyzing Visual Diff...' : 'Run AI Screen Comparison'}
        </button>
      </div>

      {/* Selector Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-clinical-white p-3 rounded-2xl border border-clinical-border flex items-center justify-between">
          <label className="text-xs font-bold text-dark-chassis">Baseline Screen (A):</label>
          <select
            value={screenAId}
            onChange={(e) => setScreenAId(e.target.value)}
            className="px-3 py-1 bg-clinical-warm border border-clinical-border rounded-xl text-xs font-medium"
          >
            {screens.map(s => (
              <option key={s.id} value={s.id}>#{s.screen_number}: {s.name}</option>
            ))}
          </select>
        </div>

        <div className="bg-clinical-white p-3 rounded-2xl border border-clinical-border flex items-center justify-between">
          <label className="text-xs font-bold text-dark-chassis">Comparison Screen (B):</label>
          <select
            value={screenBId}
            onChange={(e) => setScreenBId(e.target.value)}
            className="px-3 py-1 bg-clinical-warm border border-clinical-border rounded-xl text-xs font-medium"
          >
            {screens.map(s => (
              <option key={s.id} value={s.id}>#{s.screen_number}: {s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Side-by-side Visual Viewport */}
      <div className="flex-1 overflow-y-auto space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Screen A */}
          <div className="bg-clinical-white rounded-2xl border border-clinical-border p-4 shadow-subtle flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs border-b border-clinical-border pb-2">
              <span className="font-bold text-dark-chassis">Screen A: #{screenA?.screen_number} {screenA?.name}</span>
              <span className="px-2 py-0.5 rounded-full bg-clinical-warm text-dark-chassis text-[10px] font-mono">
                State: {screenA?.state}
              </span>
            </div>
            {screenA && (
              <div className="h-64 bg-clinical-warm rounded-xl overflow-hidden border border-clinical-border relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={screenA.image_url} alt={screenA.name} className="w-full h-full object-contain" />
              </div>
            )}
          </div>

          {/* Screen B */}
          <div className="bg-clinical-white rounded-2xl border border-clinical-border p-4 shadow-subtle flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs border-b border-clinical-border pb-2">
              <span className="font-bold text-dark-chassis">Screen B: #{screenB?.screen_number} {screenB?.name}</span>
              <span className="px-2 py-0.5 rounded-full bg-neon/30 text-dark-chassis text-[10px] font-mono font-bold">
                State: {screenB?.state}
              </span>
            </div>
            {screenB && (
              <div className="h-64 bg-clinical-warm rounded-xl overflow-hidden border border-clinical-border relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={screenB.image_url} alt={screenB.name} className="w-full h-full object-contain" />
              </div>
            )}
          </div>

        </div>

        {/* Diff Analysis Card */}
        {diffResult && (
          <div className="bg-clinical-white rounded-2xl border-2 border-dark-chassis p-5 shadow-card space-y-4 animate-fadeIn">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-neon flex items-center justify-center text-dark-chassis font-bold text-xs">
                Δ
              </div>
              <h4 className="text-sm font-bold text-dark-chassis">
                Visual & Structural Differential Report
              </h4>
            </div>

            <p className="text-xs text-txt-secondary leading-relaxed bg-clinical-warm p-3 rounded-xl border border-clinical-border">
              {diffResult.diff_summary}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {/* Added */}
              <div className="p-3 bg-status-positive/10 border border-status-positive/30 rounded-xl space-y-1">
                <span className="font-bold text-dark-chassis flex items-center gap-1">
                  <PlusCircle className="w-3.5 h-3.5 text-status-positive" />
                  Added UI Elements
                </span>
                <ul className="text-[11px] text-txt-secondary list-disc list-inside">
                  {(diffResult.added_elements || []).map((el, i) => <li key={i}>{el}</li>)}
                </ul>
              </div>

              {/* Removed */}
              <div className="p-3 bg-status-critical/10 border border-status-critical/30 rounded-xl space-y-1">
                <span className="font-bold text-status-critical flex items-center gap-1">
                  <MinusCircle className="w-3.5 h-3.5 text-status-critical" />
                  Removed / Replaced UI
                </span>
                <ul className="text-[11px] text-txt-secondary list-disc list-inside">
                  {(diffResult.removed_elements || []).map((el, i) => <li key={i}>{el}</li>)}
                </ul>
              </div>

              {/* State Transitions */}
              <div className="p-3 bg-clinical-warm border border-clinical-border rounded-xl space-y-1">
                <span className="font-bold text-dark-chassis flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5 text-dark-chassis" />
                  State & Transition
                </span>
                <p className="text-[11px] text-txt-secondary">
                  From <strong className="text-dark-chassis">{diffResult.state_change?.from}</strong> to <strong className="text-dark-chassis">{diffResult.state_change?.to}</strong>.
                </p>
                {diffResult.navigation_change && (
                  <p className="text-[10px] text-txt-muted mt-1 font-mono">
                    Trigger: {diffResult.navigation_change}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
