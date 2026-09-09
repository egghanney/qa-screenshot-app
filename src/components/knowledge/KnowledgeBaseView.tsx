'use client';

import React, { useState } from 'react';
import { 
  KnowledgeItem, 
  KnowledgeCategory, 
  ConfidenceLevel, 
  VerificationStatus, 
  Feature 
} from '@/lib/types';
import { 
  BrainCircuit, 
  CheckCircle, 
  AlertCircle, 
  HelpCircle, 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  Check, 
  X,
  ShieldCheck,
  Flag,
  BookOpen
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface KnowledgeBaseViewProps {
  items: KnowledgeItem[];
  feature: Feature;
  onRefresh: () => void;
  onGenerateKnowledge: () => void;
}

export function KnowledgeBaseView({ items, feature, onRefresh, onGenerateKnowledge }: KnowledgeBaseViewProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState<string>('all');

  // New Row Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState<KnowledgeCategory>('Business Rules & Constraints');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newConfidence, setNewConfidence] = useState<ConfidenceLevel>('CONFIRMED');

  const categories: KnowledgeCategory[] = [
    'Features & Services',
    'User Types',
    'Journeys & Navigation',
    'Interaction & Configuration Reference',
    'Business Rules & Constraints',
    'System & Failure States',
    'Communications & Dependencies',
    'Historical Knowledge & Risk'
  ];

  const confidenceBadge = (confidence: ConfidenceLevel) => {
    switch (confidence) {
      case 'CONFIRMED':
        return (
          <span className="px-2.5 py-1 rounded-pill bg-status-positive/20 text-dark-chassis border border-status-positive text-[10px] font-bold flex items-center gap-1">
            <CheckCircle className="w-2.5 h-2.5 text-dark-chassis" />
            CONFIRMED
          </span>
        );
      case 'INFERRED':
        return (
          <span className="px-2.5 py-1 rounded-pill bg-clinical-muted text-txt-secondary border border-clinical-border text-[10px] font-semibold flex items-center gap-1">
            <AlertCircle className="w-2.5 h-2.5" />
            INFERRED
          </span>
        );
      case 'UNKNOWN':
        return (
          <span className="px-2.5 py-1 rounded-pill bg-neon/40 text-dark-chassis border border-neon text-[10px] font-bold flex items-center gap-1">
            <HelpCircle className="w-2.5 h-2.5" />
            UNKNOWN
          </span>
        );
    }
  };

  const statusBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'Verified':
        return <span className="text-status-positive font-semibold flex items-center gap-1"><Check className="w-3 h-3" /> Verified</span>;
      case 'Needs Confirmation':
        return <span className="text-status-warning font-semibold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Needs Confirmation</span>;
      case 'Flagged':
        return <span className="text-status-critical font-semibold flex items-center gap-1"><Flag className="w-3 h-3" /> Flagged</span>;
      case 'Rejected':
        return <span className="text-txt-muted line-through">Rejected</span>;
    }
  };

  const handleUpdateStatus = async (itemId: string, status: VerificationStatus) => {
    await supabase.from('qa_knowledge_items').update({ verification_status: status, updated_at: new Date().toISOString() }).eq('id', itemId);
    onRefresh();
  };

  const handleDeleteItem = async (itemId: string) => {
    await supabase.from('qa_knowledge_items').delete().eq('id', itemId);
    onRefresh();
  };

  const handleCreateItem = async () => {
    if (!newTitle || !newContent) return;
    await supabase.from('qa_knowledge_items').insert({
      feature_id: feature.id,
      category: newCategory,
      title: newTitle,
      content: newContent,
      source: 'User',
      confidence: newConfidence,
      verification_status: 'Verified',
      notes: 'Directly added by user'
    });
    setIsAddModalOpen(false);
    setNewTitle('');
    setNewContent('');
    onRefresh();
  };

  const filteredItems = items.filter(it => {
    const matchesCat = activeCategory === 'all' || it.category === activeCategory;
    const matchesConf = confidenceFilter === 'all' || it.confidence === confidenceFilter;
    const matchesSearch = searchQuery === '' || 
      it.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      it.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesConf && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-4 sm:p-6 space-y-4">
      
      {/* Top Header Controls */}
      <div className="bg-clinical-white p-4 rounded-2xl border border-clinical-border shadow-subtle flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-neon animate-pulse shrink-0" />
          <div>
            <h3 className="text-xs font-bold text-dark-chassis tracking-tight">
              8-PILLAR QA & PRODUCT KNOWLEDGE BASE
            </h3>
            <p className="text-[11px] text-txt-secondary">
              Evidence-grounded specifications with strict anti-hallucination confidence labeling.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-0 px-4 py-2 sm:py-1.5 rounded-pill bg-clinical-warm hover:bg-clinical-border text-dark-chassis text-xs font-semibold border border-clinical-border flex items-center justify-center gap-2 transition active:scale-95 whitespace-nowrap shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Add Knowledge Item</span>
            <span className="sm:hidden">Add Item</span>
          </button>

          <button
            onClick={onGenerateKnowledge}
            className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-0 px-4 py-2 sm:py-1.5 rounded-pill bg-neon hover:bg-neon-bright text-dark-chassis text-xs font-bold shadow-card flex items-center justify-center gap-2 transition active:scale-95 whitespace-nowrap"
          >
            <BrainCircuit className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Regenerate Knowledge with AI</span>
            <span className="sm:hidden">Regenerate with AI</span>
          </button>
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        <button
          onClick={() => setActiveCategory('all')}
          className={`min-h-[38px] px-3.5 py-1.5 rounded-pill text-xs font-semibold whitespace-nowrap shrink-0 transition flex items-center gap-1.5 ${
            activeCategory === 'all'
              ? 'bg-dark-chassis text-white shadow-sm'
              : 'bg-clinical-white text-txt-secondary border border-clinical-border hover:bg-clinical-warm'
          }`}
        >
          <span>All Categories</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-pill font-mono font-bold leading-none ${
            activeCategory === 'all'
              ? 'bg-dark-secondary text-white'
              : 'bg-clinical-warm text-dark-chassis'
          }`}>
            {items.length}
          </span>
        </button>

        {categories.map((cat, idx) => {
          const count = items.filter(it => it.category === cat).length;
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-pill text-xs font-medium whitespace-nowrap shrink-0 transition flex items-center gap-1.5 ${
                isActive
                  ? 'bg-dark-chassis text-white font-semibold shadow-sm'
                  : 'bg-clinical-white text-txt-secondary border border-clinical-border hover:bg-clinical-warm'
              }`}
            >
              <span className="text-neon font-mono text-[10px]">#{idx + 1}</span>
              <span>{cat}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-pill font-mono font-bold leading-none ${
                isActive
                  ? 'bg-dark-secondary text-white'
                  : 'bg-clinical-warm text-dark-chassis'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Confidence Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="relative max-w-sm w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted" />
          <input
            type="text"
            placeholder="Search items, business rules, failure states..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-[38px] pl-8 pr-3 py-2 bg-clinical-white border border-clinical-border rounded-pill text-xs focus:outline-none focus:border-dark-chassis"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 w-full sm:w-auto">
          <span className="text-txt-muted text-[11px] whitespace-nowrap shrink-0 hidden xs:inline">Filter by Confidence:</span>
          {['all', 'CONFIRMED', 'INFERRED', 'UNKNOWN'].map((conf) => (
            <button
              key={conf}
              onClick={() => setConfidenceFilter(conf)}
              className={`min-h-[34px] px-3 py-1 rounded-pill text-[11px] font-semibold border whitespace-nowrap shrink-0 transition ${
                confidenceFilter === conf 
                  ? 'bg-dark-chassis text-neon border-dark-chassis shadow-xs' 
                  : 'bg-clinical-white text-txt-secondary border-clinical-border hover:bg-clinical-warm'
              }`}
            >
              {conf.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Structured Clinical Knowledge Table (Desktop lg:block) */}
      <div className="hidden lg:flex flex-1 bg-clinical-white rounded-2xl border border-clinical-border shadow-card overflow-hidden flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-clinical-surface text-txt-secondary border-b border-clinical-border font-mono text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold">Title & Specification</th>
                <th className="py-3 px-3 font-semibold">Source</th>
                <th className="py-3 px-3 font-semibold">Confidence</th>
                <th className="py-3 px-3 font-semibold">Status</th>
                <th className="py-3 px-3 font-semibold">Notes / Trace</th>
                <th className="py-3 px-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-clinical-border/60">
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-txt-secondary">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <BookOpen className="w-8 h-8 text-txt-muted opacity-40" />
                      <p className="text-xs font-bold text-dark-chassis">No Knowledge Items Documented</p>
                      <p className="text-[11px] text-txt-muted">
                        Generate the 8 core pillars from your sequenced screens or click &quot;Add Knowledge Item&quot; to manually define verified rules.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-clinical-warm/60 transition group">
                  
                  {/* Category Pill */}
                  <td className="py-3 px-4 align-top whitespace-nowrap">
                    <span className="px-2.5 py-1 rounded-pill bg-clinical-warm text-dark-chassis font-medium text-[10px] border border-clinical-border">
                      {item.category}
                    </span>
                  </td>

                  {/* Title & Content */}
                  <td className="py-3 px-4 align-top max-w-md">
                    <h4 className="font-semibold text-dark-chassis mb-1 text-xs">{item.title}</h4>
                    <p className="text-txt-secondary text-[11px] leading-relaxed">{item.content}</p>
                  </td>

                  {/* Source */}
                  <td className="py-3 px-3 align-top whitespace-nowrap">
                    <span className="text-txt-muted text-[11px] font-mono">{item.source}</span>
                  </td>

                  {/* Confidence Pill */}
                  <td className="py-3 px-3 align-top whitespace-nowrap">
                    {confidenceBadge(item.confidence)}
                  </td>

                  {/* Verification Status */}
                  <td className="py-3 px-3 align-top whitespace-nowrap text-[11px]">
                    {statusBadge(item.verification_status)}
                  </td>

                  {/* Notes / Trace */}
                  <td className="py-3 px-3 align-top max-w-xs text-txt-muted text-[10px] italic">
                    {item.notes || '—'}
                  </td>

                  {/* Quick Verification & Management Actions */}
                  <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition">
                      <button
                        onClick={() => handleUpdateStatus(item.id, 'Verified')}
                        className="p-1.5 rounded-pill bg-clinical-warm hover:bg-status-positive/20 text-dark-chassis transition"
                        title="Mark Verified"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-status-positive" />
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(item.id, 'Flagged')}
                        className="p-1.5 rounded-pill bg-clinical-warm hover:bg-status-warning/20 text-dark-chassis transition"
                        title="Flag for Review"
                      >
                        <Flag className="w-3.5 h-3.5 text-status-warning" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 rounded-pill bg-clinical-warm hover:bg-status-critical/20 text-txt-muted hover:text-status-critical transition"
                        title="Delete Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Knowledge Cards (lg:hidden) */}
      <div className="lg:hidden flex-1 overflow-y-auto space-y-3 pb-6">
        {filteredItems.length === 0 ? (
          <div className="py-12 text-center text-txt-secondary bg-clinical-white rounded-2xl border border-clinical-border p-6">
            <BookOpen className="w-8 h-8 text-txt-muted opacity-40 mx-auto mb-2" />
            <p className="text-xs font-bold text-dark-chassis">No Knowledge Items Documented</p>
            <p className="text-[11px] text-txt-muted mt-1">
              Generate the 8 core pillars from your sequenced screens or tap &quot;Add Knowledge Item&quot; to manually define verified rules.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-3">
              <button
                onClick={onGenerateKnowledge}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-pill bg-neon hover:bg-neon-bright text-dark-chassis text-xs font-bold shadow-card flex items-center justify-center gap-2 transition active:scale-95"
              >
                <BrainCircuit className="w-4 h-4" />
                <span>Generate 8 Pillars with AI</span>
              </button>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-pill bg-clinical-warm hover:bg-clinical-border text-dark-chassis text-xs font-semibold border border-clinical-border flex items-center justify-center gap-2 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Knowledge Item</span>
              </button>
            </div>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div key={item.id} className="bg-clinical-white rounded-2xl border border-clinical-border p-4 shadow-subtle space-y-3">
              <div className="flex items-start justify-between gap-2">
                <span className="px-2.5 py-1 rounded-pill bg-clinical-warm text-dark-chassis font-medium text-[10px] border border-clinical-border truncate max-w-[200px]">
                  {item.category}
                </span>
                {confidenceBadge(item.confidence)}
              </div>

              <div>
                <h4 className="font-bold text-dark-chassis text-sm mb-1">{item.title}</h4>
                <p className="text-txt-secondary text-xs leading-relaxed">{item.content}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-clinical-border/40 text-[11px]">
                <div className="flex items-center gap-1.5 text-txt-muted">
                  <span className="font-mono text-[10px]">Src: {item.source}</span>
                  <span>•</span>
                  <span>{statusBadge(item.verification_status)}</span>
                </div>
                {item.notes && (
                  <p className="w-full text-txt-muted text-[10px] italic">
                    Note: {item.notes}
                  </p>
                )}
              </div>

              {/* Mobile Pill Actions with touch targets & 100% pill integrity */}
              <div className="flex items-center gap-2 pt-2 border-t border-clinical-border/40">
                <button
                  onClick={() => handleUpdateStatus(item.id, item.verification_status === 'Verified' ? 'Needs Confirmation' : 'Verified')}
                  className={`flex-1 min-h-[44px] px-3 py-2 rounded-pill text-xs font-bold border flex items-center justify-center gap-1.5 transition active:scale-95 ${
                    item.verification_status === 'Verified'
                      ? 'bg-status-positive text-dark-chassis border-status-positive shadow-xs'
                      : 'bg-clinical-warm hover:bg-status-positive/20 text-dark-chassis border-clinical-border'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>{item.verification_status === 'Verified' ? 'Verified' : 'Verify'}</span>
                </button>
                <button
                  onClick={() => handleUpdateStatus(item.id, item.verification_status === 'Flagged' ? 'Needs Confirmation' : 'Flagged')}
                  className={`flex-1 min-h-[44px] px-3 py-2 rounded-pill text-xs font-bold border flex items-center justify-center gap-1.5 transition active:scale-95 ${
                    item.verification_status === 'Flagged'
                      ? 'bg-status-warning text-dark-chassis border-status-warning shadow-xs'
                      : 'bg-clinical-warm hover:bg-status-warning/20 text-dark-chassis border-clinical-border'
                  }`}
                >
                  <Flag className="w-4 h-4 shrink-0" />
                  <span>{item.verification_status === 'Flagged' ? 'Flagged' : 'Flag'}</span>
                </button>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="min-h-[44px] w-11 h-11 rounded-pill bg-clinical-warm hover:bg-status-critical/20 text-txt-muted hover:text-status-critical border border-clinical-border flex items-center justify-center transition active:scale-95 shrink-0"
                  title="Delete Item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Knowledge Item Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-black/70 backdrop-blur-sm">
          <div className="bg-clinical-surface rounded-[28px] border border-clinical-border shadow-modal max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-clinical-border pb-3">
              <h3 className="text-sm font-bold text-dark-chassis">Add Confirmed Knowledge Item</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-txt-muted hover:text-dark-chassis">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Knowledge Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-clinical-white border border-clinical-border"
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Title</label>
                <input
                  type="text"
                  placeholder="e.g. KYC Limit Tier 1"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-clinical-white border border-clinical-border"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Specification / Content</label>
                <textarea
                  rows={3}
                  placeholder="Exact confirmed specification or business rule..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-clinical-white border border-clinical-border"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Confidence</label>
                <div className="flex gap-2">
                  {(['CONFIRMED', 'INFERRED', 'UNKNOWN'] as ConfidenceLevel[]).map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewConfidence(c)}
                      className={`min-h-[38px] px-3.5 py-1.5 rounded-pill text-xs font-semibold border transition ${newConfidence === c ? 'bg-dark-chassis text-neon font-bold border-dark-chassis' : 'bg-clinical-white text-txt-secondary border-clinical-border'}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-clinical-border">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="min-h-[44px] px-4 py-2 rounded-pill text-xs font-semibold border border-clinical-border bg-clinical-white text-dark-chassis hover:bg-clinical-warm transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateItem}
                className="min-h-[44px] px-5 py-2 rounded-pill text-xs font-bold bg-neon hover:bg-neon-bright text-dark-chassis shadow-card transition active:scale-95"
              >
                Save Knowledge Item
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
