'use client';

import React, { useState } from 'react';
import { QACharter } from '@/lib/types';
import { FeedbackReason } from '@/lib/mcp/contracts/schemas';
import { X, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface CharterReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  charter: QACharter | null;
  onReviewSubmitted: () => Promise<void>;
}

const FEEDBACK_REASONS: FeedbackReason[] = [
  'Too scripted',
  'Unsupported assumption',
  'Missing risk',
  'Irrelevant',
  'Duplicate',
  'Too broad',
  'Wrong interpretation',
  'Other'
];

export function CharterReviewModal({
  isOpen,
  onClose,
  charter,
  onReviewSubmitted
}: CharterReviewModalProps) {
  const [decision, setDecision] = useState<'Approved' | 'Rejected'>('Approved');
  const [reason, setReason] = useState<FeedbackReason>('Too scripted');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !charter) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/charters/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          charter_id: charter.id,
          decision,
          reason: decision === 'Rejected' ? reason : undefined,
          notes: notes.trim() || undefined,
          reviewed_by: 'QA Lead Tester',
          reviewed_at: new Date().toISOString()
        })
      });

      if (!res.ok) {
        throw new Error('Failed to record human review');
      }

      await onReviewSubmitted();
      onClose();
    } catch (err) {
      console.error('Error submitting review:', err);
      alert('Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in-50">
      <div 
        className="bg-white rounded-[24px] border border-clinical-border shadow-2xl w-full max-w-md flex flex-col overflow-hidden text-dark-chassis"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-clinical-border bg-slate-50 flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold tracking-tight">Review &amp; Accept Charter</h2>
            <p className="text-xs text-txt-muted">{charter.charter_code} | Human-in-the-Loop Quality Control</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-txt-muted hover:text-dark-chassis transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Decision Selector */}
          <div>
            <label className="font-bold text-dark-chassis block mb-2">Review Decision:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDecision('Approved')}
                className={`py-2 px-3 rounded-xl border font-semibold flex items-center justify-center gap-2 transition ${
                  decision === 'Approved'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-400 ring-2 ring-emerald-400/20'
                    : 'bg-white text-txt-muted border-clinical-border hover:bg-slate-50'
                }`}
              >
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Approve Charter</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('Rejected')}
                className={`py-2 px-3 rounded-xl border font-semibold flex items-center justify-center gap-2 transition ${
                  decision === 'Rejected'
                    ? 'bg-rose-50 text-rose-800 border-rose-400 ring-2 ring-rose-400/20'
                    : 'bg-white text-txt-muted border-clinical-border hover:bg-slate-50'
                }`}
              >
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Reject / Flag</span>
              </button>
            </div>
          </div>

          {/* Feedback Reason (if rejected) */}
          {decision === 'Rejected' && (
            <div className="space-y-2 animate-in fade-in-50">
              <label className="font-bold text-dark-chassis block">
                Structured Feedback Reason:
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as FeedbackReason)}
                className="w-full p-2.5 rounded-xl border border-clinical-border bg-white text-dark-chassis font-medium focus:outline-none focus:border-dark-chassis"
              >
                {FEEDBACK_REASONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <p className="text-[11px] text-txt-muted">
                Capturing structured feedback grounds the AI model on future charter generations.
              </p>
            </div>
          )}

          {/* Optional Notes */}
          <div className="space-y-1.5">
            <label className="font-bold text-dark-chassis block">
              Tester Observations &amp; Guidance (Optional):
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide context on why this charter was approved or rejected..."
              rows={3}
              className="w-full p-2.5 rounded-xl border border-clinical-border bg-white text-dark-chassis placeholder:text-txt-muted focus:outline-none focus:border-dark-chassis"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-clinical-border bg-slate-50 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-pill border border-clinical-border text-dark-secondary hover:bg-slate-200 text-xs font-semibold transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`px-4 py-1.5 rounded-pill text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95 ${
              decision === 'Approved'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-rose-600 hover:bg-rose-700 text-white'
            }`}
          >
            {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            <span>Confirm {decision}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
