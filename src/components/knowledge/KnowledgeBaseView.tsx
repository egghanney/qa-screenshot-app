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
  Sparkles, 
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
  Flag
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
    'Communications & Dependencies'
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
      <div className="bg-clinical-white p-4 rounded-2xl border border-clinical-border shadow-subtle flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-neon animate-pulse" />
          <div>
            <h3 className="text-xs font-bold text-dark-chassis tracking-tight">
              7-CATEGORY QA & PRODUCT KNOWLEDGE BASE
            </h3>
            <p className="text-[11px] text-txt-secondary">
              Evidence-grounded specifications with strict anti-hallucination confidence labeling.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-1.5 rounded-pill bg-clinical-warm hover:bg-clinical-border text-dark-chassis text-xs font-semibold border border-clinical-border flex items-center gap-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Knowledge Item
          </button>

          <button
            onClick={onGenerateKnowledge}
            className="px-4 py-1.5 rounded-pill bg-neon hover:bg-neon-bright text-dark-chassis text-xs font-bold shadow-card flex items-center gap-1.5 transition active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Regenerate Knowledge with AI
          </button>
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1.5 rounded-pill text-xs font-semibold transition ${
            activeCategory === 'all'
              ? 'bg-dark-chassis text-white shadow-sm'
              : 'bg-clinical-white text-txt-secondary border border-clinical-border hover:bg-clinical-warm'
          }`}
        >
          All Categories ({items.length})
        </button>

        {categories.map((cat, idx) => {
          const count = items.filter(it => it.category === cat).length;
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-pill text-xs font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
                isActive
                  ? 'bg-dark-chassis text-white font-semibold shadow-sm'
                  : 'bg-clinical-white text-txt-secondary border border-clinical-border hover:bg-clinical-warm'
              }`}
            >
              <span className="text-neon font-mono text-[10px]">#{idx + 1}</span>
              <span>{cat}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-clinical-warm text-dark-chassis">
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
            className="w-full pl-8 pr-3 py-1.5 bg-clinical-white border border-clinical-border rounded-pill text-xs focus:outline-none focus:border-dark-chassis"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-txt-muted text-[11px]">Filter by Confidence:</span>
          {['all', 'CONFIRMED', 'INFERRED', 'UNKNOWN'].map((conf) => (
            <button
              key={conf}
              onClick={() => setConfidenceFilter(conf)}
              className={`px-2.5 py-1 rounded-pill text-[10px] font-semibold border transition ${
                confidenceFilter === conf 
                  ? 'bg-dark-chassis text-neon border-dark-chassis' 
                  : 'bg-clinical-white text-txt-secondary border-clinical-border'
              }`}
            >
              {conf.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Structured Clinical Knowledge Table */}
      <div className="flex-1 bg-clinical-white rounded-2xl border border-clinical-border shadow-card overflow-hidden flex flex-col">
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
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-clinical-warm/60 transition group">
                  
                  {/* Category Pill */}
                  <td className="py-3 px-4 align-top whitespace-nowrap">
                    <span className="px-2 py-1 rounded bg-clinical-warm text-dark-chassis font-medium text-[10px] border border-clinical-border">
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
                        className="p-1 rounded bg-clinical-warm hover:bg-status-positive/20 text-dark-chassis"
                        title="Mark Verified"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-status-positive" />
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(item.id, 'Flagged')}
                        className="p-1 rounded bg-clinical-warm hover:bg-status-warning/20 text-dark-chassis"
                        title="Flag for Review"
                      >
                        <Flag className="w-3.5 h-3.5 text-status-warning" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1 rounded bg-clinical-warm hover:bg-status-critical/20 text-txt-muted hover:text-status-critical"
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
                  className="w-full p-2 rounded-xl bg-clinical-white border border-clinical-border"
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
                  className="w-full p-2 rounded-xl bg-clinical-white border border-clinical-border"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Specification / Content</label>
                <textarea
                  rows={3}
                  placeholder="Exact confirmed specification or business rule..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full p-2 rounded-xl bg-clinical-white border border-clinical-border"
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
                      className={`px-3 py-1 rounded-pill text-xs border ${newConfidence === c ? 'bg-dark-chassis text-neon font-bold' : 'bg-clinical-white text-txt-secondary'}`}
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
                className="px-4 py-1.5 rounded-pill text-xs border border-clinical-border bg-clinical-white text-dark-chassis"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateItem}
                className="px-5 py-1.5 rounded-pill text-xs font-bold bg-neon text-dark-chassis shadow"
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
