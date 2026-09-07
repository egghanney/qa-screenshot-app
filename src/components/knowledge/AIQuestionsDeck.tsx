'use client';

import React, { useState } from 'react';
import { AIQuestion, Feature } from '@/lib/types';
import { HelpCircle, CheckCircle, Send, Sparkles, Check, ArrowRight } from 'lucide-react';

interface AIQuestionsDeckProps {
  questions: AIQuestion[];
  feature: Feature;
  onRefresh: () => void;
}

export function AIQuestionsDeck({ questions, feature, onRefresh }: AIQuestionsDeckProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const pendingQuestions = questions.filter(q => q.status === 'Pending');
  const answeredQuestions = questions.filter(q => q.status === 'Answered');

  const handleAnswerSubmit = async (questionId: string) => {
    const answer = answers[questionId];
    if (!answer || answer.trim() === '') return;

    setSubmittingId(questionId);
    try {
      const res = await fetch('/api/knowledge/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: questionId,
          answer,
          feature_id: feature.id
        })
      });

      if (res.ok) {
        onRefresh();
      }
    } catch (e) {
      console.error('Failed submitting answer', e);
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-4 sm:p-6 space-y-6">
      
      {/* Top Banner */}
      <div className="bg-clinical-white p-4 rounded-2xl border border-clinical-border shadow-subtle flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-neon/30 border border-neon flex items-center justify-center text-dark-chassis">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-dark-chassis tracking-tight">
              AI Information Gap Discovery ({pendingQuestions.length} Unknowns Identified)
            </h3>
            <p className="text-xs text-txt-secondary">
              The AI highlights specifications not verified in screenshots. Answer these questions to promote knowledge items to CONFIRMED.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-2.5 py-1 rounded-pill bg-clinical-warm border border-clinical-border text-dark-chassis">
            {answeredQuestions.length} Resolved
          </span>
          <span className="px-2.5 py-1 rounded-pill bg-neon/40 border border-neon text-dark-chassis font-bold">
            {pendingQuestions.length} Pending Resolution
          </span>
        </div>
      </div>

      {/* Cards List */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {pendingQuestions.length === 0 ? (
          <div className="bg-clinical-white rounded-2xl border border-clinical-border p-8 text-center max-w-md mx-auto space-y-2">
            <CheckCircle className="w-8 h-8 text-status-positive mx-auto" />
            <h4 className="text-sm font-bold text-dark-chassis">All Information Gaps Clarified</h4>
            <p className="text-xs text-txt-secondary">
              There are no pending questions. All identified business rules and failure boundaries have been addressed.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingQuestions.map((q, idx) => (
              <div 
                key={q.id}
                className="bg-clinical-white rounded-2xl border-2 border-clinical-border hover:border-dark-chassis transition-all shadow-card p-4 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] font-semibold text-txt-muted uppercase mb-1">
                    <span className="flex items-center gap-1 font-mono text-neon font-bold">
                      <span className="w-2 h-2 rounded-full bg-neon" />
                      GAP #{idx + 1}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-clinical-warm text-dark-chassis border border-clinical-border">
                      {q.category || 'Business Rule'}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-dark-chassis mb-1.5">
                    {q.question}
                  </h4>

                  {q.impact_analysis && (
                    <div className="p-2 bg-clinical-warm rounded-xl border border-clinical-border/80 text-[11px] text-txt-secondary">
                      <span className="font-semibold text-dark-chassis">QA Impact:</span> {q.impact_analysis}
                    </div>
                  )}
                </div>

                {/* Answer Input */}
                <div className="space-y-2 pt-2 border-t border-clinical-border/60">
                  <label className="text-[10px] font-semibold text-dark-chassis block">
                    Your Resolution / Fact:
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="e.g. Minimum amount is GHS 1.00; SMS dispatch is triggered on settlement."
                      value={answers[q.id] || ''}
                      onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && handleAnswerSubmit(q.id)}
                      className="flex-1 px-3 py-1.5 bg-clinical-warm border border-clinical-border rounded-xl text-xs focus:outline-none focus:border-dark-chassis"
                    />
                    <button
                      onClick={() => handleAnswerSubmit(q.id)}
                      disabled={submittingId === q.id || !answers[q.id]}
                      className="px-3 py-1.5 rounded-xl bg-dark-chassis hover:bg-dark-secondary text-neon text-xs font-bold flex items-center gap-1 disabled:opacity-40 transition"
                    >
                      <Send className="w-3 h-3" />
                      Save
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

        {/* Answered Section */}
        {answeredQuestions.length > 0 && (
          <div className="pt-4 space-y-2">
            <h4 className="text-xs font-bold text-dark-chassis uppercase tracking-wider flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-status-positive" />
              Resolved Questions ({answeredQuestions.length})
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {answeredQuestions.map((q) => (
                <div key={q.id} className="p-3 bg-clinical-surface rounded-xl border border-clinical-border/80 text-xs space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-txt-muted">
                    <span className="font-medium text-dark-chassis">{q.question}</span>
                    <span className="text-status-positive font-semibold font-mono">RESOLVED</span>
                  </div>
                  <p className="text-dark-chassis font-semibold text-[11px] bg-clinical-white p-2 rounded-lg border border-clinical-border">
                    {q.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
