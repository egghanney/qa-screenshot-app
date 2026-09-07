'use client';

import React, { useState } from 'react';
import { QAObservation, ObservationType, ScreenItem, Feature } from '@/lib/types';
import { 
  AlertCircle, 
  Plus, 
  X, 
  Trash2, 
  ShieldAlert, 
  Bug, 
  Compass, 
  Layers, 
  Check, 
  Filter 
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface ObservationTrackerProps {
  observations: QAObservation[];
  screens: ScreenItem[];
  feature: Feature;
  onRefresh: () => void;
}

export function ObservationTracker({ observations, screens, feature, onRefresh }: ObservationTrackerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ObservationType>('Bug');
  const [severity, setSeverity] = useState<QAObservation['severity']>('Major');
  const [priority, setPriority] = useState<QAObservation['priority']>('P1');
  const [selectedScreenId, setSelectedScreenId] = useState<string>(screens[0]?.id || '');
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [actualBehavior, setActualBehavior] = useState('');

  const types: ObservationType[] = [
    'Bug',
    'UX Issue',
    'Requirement Gap',
    'Business Rule Issue',
    'Security Concern',
    'Data Issue',
    'Performance Issue',
    'Integration Issue'
  ];

  const handleCreateObservation = async () => {
    if (!title || !description) return;
    await supabase.from('qa_observations').insert({
      feature_id: feature.id,
      screen_id: selectedScreenId || null,
      type,
      title,
      description,
      severity,
      priority,
      expected_behavior: expectedBehavior,
      actual_behavior: actualBehavior,
      status: 'Open'
    });

    setIsModalOpen(false);
    setTitle('');
    setDescription('');
    setExpectedBehavior('');
    setActualBehavior('');
    onRefresh();
  };

  const handleUpdateStatus = async (obsId: string, status: QAObservation['status']) => {
    await supabase.from('qa_observations').update({ status, updated_at: new Date().toISOString() }).eq('id', obsId);
    onRefresh();
  };

  const handleDelete = async (obsId: string) => {
    await supabase.from('qa_observations').delete().eq('id', obsId);
    onRefresh();
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-4 sm:p-6 space-y-4">
      
      {/* Header */}
      <div className="bg-clinical-white p-4 rounded-2xl border border-clinical-border shadow-subtle flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-status-critical" />
          <div>
            <h3 className="text-xs font-bold text-dark-chassis tracking-tight">
              DEFECT & OBSERVATION TRACKER ({observations.length} Logged)
            </h3>
            <p className="text-[11px] text-txt-secondary">
              Attach empirical bugs, UX friction, and requirement discrepancies directly to screens.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-1.5 rounded-pill bg-dark-chassis text-neon text-xs font-bold shadow-subtle flex items-center gap-1.5 hover:bg-dark-secondary transition"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          Log Observation / Defect
        </button>
      </div>

      {/* Observations Grid */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {observations.length === 0 ? (
          <div className="bg-clinical-white rounded-2xl border border-clinical-border p-8 text-center max-w-md mx-auto space-y-2">
            <Check className="w-8 h-8 text-status-positive mx-auto" />
            <h4 className="text-sm font-bold text-dark-chassis">No Defects or Observations Logged</h4>
            <p className="text-xs text-txt-secondary">
              All screens and journeys are free of flagged bugs and UX issues.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {observations.map((obs) => {
              const linkedScreen = screens.find(s => s.id === obs.screen_id);
              return (
                <div key={obs.id} className="bg-clinical-white rounded-2xl border border-clinical-border p-4 shadow-card flex flex-col justify-between space-y-3">
                  <div>
                    {/* Header line */}
                    <div className="flex items-center justify-between text-[10px] font-mono mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded font-bold ${
                          obs.type === 'Bug' ? 'bg-status-critical text-white' : 'bg-neon text-dark-chassis'
                        }`}>
                          {obs.type}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-dark-chassis text-white font-bold">
                          {obs.priority}
                        </span>
                        <span className="text-txt-muted">{obs.severity}</span>
                      </div>

                      {linkedScreen && (
                        <span className="px-2 py-0.5 rounded bg-clinical-warm text-dark-chassis border border-clinical-border font-sans font-medium">
                          Screen #{linkedScreen.screen_number}: {linkedScreen.name}
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-dark-chassis mb-1">
                      {obs.title}
                    </h4>
                    <p className="text-xs text-txt-secondary mb-2">
                      {obs.description}
                    </p>

                    {(obs.expected_behavior || obs.actual_behavior) && (
                      <div className="grid grid-cols-2 gap-2 text-[10px] p-2 bg-clinical-warm rounded-xl border border-clinical-border">
                        <div>
                          <span className="font-bold text-status-positive block">Expected:</span>
                          <span className="text-txt-secondary">{obs.expected_behavior || '—'}</span>
                        </div>
                        <div>
                          <span className="font-bold text-status-critical block">Actual:</span>
                          <span className="text-txt-secondary">{obs.actual_behavior || '—'}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status & Actions */}
                  <div className="pt-2 border-t border-clinical-border/60 flex items-center justify-between text-xs">
                    <select
                      value={obs.status}
                      onChange={(e) => handleUpdateStatus(obs.id, e.target.value as any)}
                      className="px-2.5 py-1 bg-clinical-warm border border-clinical-border rounded-pill text-[11px] font-semibold text-dark-chassis"
                    >
                      <option value="Open">Status: Open</option>
                      <option value="In Review">Status: In Review</option>
                      <option value="Resolved">Status: Resolved</option>
                      <option value="Won't Fix">Status: Won't Fix</option>
                    </select>

                    <button
                      onClick={() => handleDelete(obs.id)}
                      className="p-1 rounded hover:bg-status-critical/20 text-txt-muted hover:text-status-critical"
                      title="Delete Defect"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Log Observation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-black/70 backdrop-blur-sm">
          <div className="bg-clinical-surface rounded-[28px] border border-clinical-border shadow-modal max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-clinical-border pb-3">
              <h3 className="text-sm font-bold text-dark-chassis">Log Defect / Observation</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-txt-muted hover:text-dark-chassis">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Issue Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full p-2 rounded-xl bg-clinical-white border border-clinical-border"
                  >
                    {types.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Linked Screen</label>
                  <select
                    value={selectedScreenId}
                    onChange={(e) => setSelectedScreenId(e.target.value)}
                    className="w-full p-2 rounded-xl bg-clinical-white border border-clinical-border"
                  >
                    <option value="">General (No Screen)</option>
                    {screens.map(s => <option key={s.id} value={s.id}>#{s.screen_number}: {s.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Keyboard obscures Continue CTA button on low DPI"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2 rounded-xl bg-clinical-white border border-clinical-border"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Description & Evidence</label>
                <textarea
                  rows={2}
                  placeholder="Detailed description of the issue..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 rounded-xl bg-clinical-white border border-clinical-border"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Expected Behavior</label>
                  <input
                    type="text"
                    placeholder="e.g. Viewport adjusts to keep CTA visible"
                    value={expectedBehavior}
                    onChange={(e) => setExpectedBehavior(e.target.value)}
                    className="w-full p-2 rounded-xl bg-clinical-white border border-clinical-border"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Actual Behavior</label>
                  <input
                    type="text"
                    placeholder="e.g. CTA is hidden under keyboard"
                    value={actualBehavior}
                    onChange={(e) => setActualBehavior(e.target.value)}
                    className="w-full p-2 rounded-xl bg-clinical-white border border-clinical-border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Severity</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as any)}
                    className="w-full p-2 rounded-xl bg-clinical-white border border-clinical-border"
                  >
                    <option value="Critical">Critical</option>
                    <option value="Major">Major</option>
                    <option value="Minor">Minor</option>
                    <option value="Trivial">Trivial</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full p-2 rounded-xl bg-clinical-white border border-clinical-border"
                  >
                    <option value="P0">P0 (Blocker)</option>
                    <option value="P1">P1 (High)</option>
                    <option value="P2">P2 (Medium)</option>
                    <option value="P3">P3 (Low)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-clinical-border">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-1.5 rounded-pill text-xs border border-clinical-border bg-clinical-white text-dark-chassis"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateObservation}
                className="px-5 py-1.5 rounded-pill text-xs font-bold bg-dark-chassis text-neon shadow"
              >
                Log Defect
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
