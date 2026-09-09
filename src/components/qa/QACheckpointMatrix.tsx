'use client';

import React, { useState } from 'react';
import { QACheckpoint, CheckpointCategory, Feature } from '@/lib/types';
import { 
  BrainCircuit, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertOctagon, 
  Download, 
  Filter, 
  Search,
  Plus,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import Papa from 'papaparse';

interface QACheckpointMatrixProps {
  checkpoints: QACheckpoint[];
  feature: Feature;
  onRefresh: () => void;
  onGenerateCheckpoints: () => void;
}

export function QACheckpointMatrix({ checkpoints, feature, onRefresh, onGenerateCheckpoints }: QACheckpointMatrixProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const categories: CheckpointCategory[] = [
    'Field Validation',
    'Navigation',
    'Transaction',
    'Security & Failure',
    'State & Boundary'
  ];

  const handleUpdateStatus = async (cpId: string, status: QACheckpoint['status']) => {
    await supabase.from('qa_checkpoints').update({ status }).eq('id', cpId);
    onRefresh();
  };

  const exportCSV = () => {
    const csvData = checkpoints.map(cp => ({
      Category: cp.category,
      Title: cp.title,
      Steps: cp.test_steps.replace(/\n/g, ' | '),
      ExpectedResult: cp.expected_result,
      TestData: cp.test_data_notes || '',
      Priority: cp.priority,
      Status: cp.status
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${feature.name.replace(/\s+/g, '_')}_QA_Checkpoints.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = checkpoints.filter(cp => {
    const matchesCat = activeCategory === 'all' || cp.category === activeCategory;
    const matchesStatus = statusFilter === 'all' || cp.status === statusFilter;
    const matchesSearch = searchQuery === '' || 
      cp.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      cp.test_steps.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesStatus && matchesSearch;
  });

  const priorityColor = (p: string) => {
    switch (p) {
      case 'Critical': return 'bg-status-critical text-white font-bold';
      case 'High': return 'bg-neon text-dark-chassis font-bold';
      case 'Medium': return 'bg-clinical-muted text-dark-chassis font-medium';
      case 'Low': return 'bg-clinical-surface text-txt-muted';
    }
  };

  const statusPill = (status: QACheckpoint['status']) => {
    switch (status) {
      case 'Passed':
        return <span className="text-status-positive font-bold flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Passed</span>;
      case 'Failed':
        return <span className="text-status-critical font-bold flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Failed</span>;
      case 'Blocked':
        return <span className="text-status-warning font-bold flex items-center gap-1"><AlertOctagon className="w-3.5 h-3.5" /> Blocked</span>;
      case 'Not Run':
        return <span className="text-txt-muted flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Not Run</span>;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-4 sm:p-6 space-y-4">
      
      {/* Top Banner & Exporters */}
      <div className="bg-clinical-white p-4 rounded-2xl border border-clinical-border shadow-subtle flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-neon animate-pulse" />
          <div>
            <h3 className="text-xs font-bold text-dark-chassis tracking-tight">
              QA VERIFICATION CHECKPOINT MATRIX ({checkpoints.length} Checkpoints)
            </h3>
            <p className="text-[11px] text-txt-secondary">
              Field boundaries, navigation resiliency, and transactional failure test permutations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="px-3.5 py-1.5 rounded-pill bg-clinical-warm hover:bg-clinical-border text-dark-chassis text-xs font-semibold border border-clinical-border flex items-center gap-1.5 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export CSV / Excel
          </button>

          <button
            onClick={onGenerateCheckpoints}
            className="px-4 py-1.5 rounded-pill bg-neon hover:bg-neon-bright text-dark-chassis text-xs font-bold shadow-card flex items-center gap-1.5 transition active:scale-95"
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            Generate QA Checkpoints with AI
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3.5 py-1.5 rounded-pill text-xs font-semibold whitespace-nowrap shrink-0 transition flex items-center gap-1.5 ${
            activeCategory === 'all'
              ? 'bg-dark-chassis text-white shadow-sm'
              : 'bg-clinical-white text-txt-secondary border border-clinical-border hover:bg-clinical-warm'
          }`}
        >
          <span>All Categories</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold leading-none ${
            activeCategory === 'all'
              ? 'bg-dark-secondary text-white'
              : 'bg-clinical-warm text-dark-chassis'
          }`}>
            {checkpoints.length}
          </span>
        </button>

        {categories.map((cat) => {
          const count = checkpoints.filter(cp => cp.category === cat).length;
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-pill text-xs font-medium whitespace-nowrap shrink-0 transition flex items-center gap-1.5 ${
                isActive
                  ? 'bg-dark-chassis text-white font-semibold shadow-sm'
                  : 'bg-clinical-white text-txt-secondary border border-clinical-border hover:bg-clinical-warm'
              }`}
            >
              <span>{cat}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold leading-none ${
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

      {/* Search & Status Filters */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="relative max-w-sm w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted" />
          <input
            type="text"
            placeholder="Search checkpoints, boundaries, negative tests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-clinical-white border border-clinical-border rounded-pill text-xs focus:outline-none focus:border-dark-chassis"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-txt-muted text-[11px] whitespace-nowrap shrink-0">Status Filter:</span>
          {(['all', 'Not Run', 'Passed', 'Failed', 'Blocked'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-pill text-[10px] font-semibold border whitespace-nowrap shrink-0 transition ${
                statusFilter === st 
                  ? 'bg-dark-chassis text-neon border-dark-chassis' 
                  : 'bg-clinical-white text-txt-secondary border-clinical-border'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Checkpoint Matrix Container: Mobile Cards (lg:hidden) + Desktop Table (hidden lg:block) */}
      <div className="flex-1 bg-clinical-white rounded-2xl border border-clinical-border shadow-card overflow-hidden flex flex-col">
        
        {/* Mobile Cards View (lg:hidden) */}
        <div className="block lg:hidden overflow-y-auto flex-1 p-3 space-y-3">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-txt-secondary">
              <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                <ShieldCheck className="w-8 h-8 text-txt-muted opacity-40" />
                <p className="text-xs font-bold text-dark-chassis">No QA Checkpoints Generated</p>
                <p className="text-[11px] text-txt-muted">
                  Click &quot;Generate QA Checkpoints with AI&quot; to synthesize test procedures and validation scenarios.
                </p>
              </div>
            </div>
          ) : (
            filtered.map((cp) => (
              <div key={cp.id} className="p-3.5 rounded-2xl bg-clinical-white border border-clinical-border shadow-subtle space-y-3">
                {/* Header: Priority & Category */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded-pill text-[10px] ${priorityColor(cp.priority)}`}>
                      {cp.priority}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-pill bg-clinical-warm text-dark-chassis font-medium text-[10px] border border-clinical-border">
                      {cp.category}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-txt-muted">
                    {cp.test_data_notes || 'Standard'}
                  </span>
                </div>

                {/* Title */}
                <h4 className="font-bold text-dark-chassis text-xs leading-snug">
                  {cp.title}
                </h4>

                {/* Procedure & Expected Result */}
                <div className="space-y-2 text-[11px] bg-clinical-warm/50 p-2.5 rounded-xl border border-clinical-border/50">
                  <div>
                    <span className="text-[10px] font-bold text-dark-chassis uppercase tracking-wider block font-mono">Procedure:</span>
                    <p className="text-txt-secondary whitespace-pre-line font-mono text-[10px] leading-relaxed">{cp.test_steps}</p>
                  </div>
                  <div className="pt-1.5 border-t border-clinical-border/40">
                    <span className="text-[10px] font-bold text-dark-chassis uppercase tracking-wider block font-mono">Expected Result:</span>
                    <p className="text-txt-primary font-medium text-[11px]">{cp.expected_result}</p>
                  </div>
                </div>

                {/* Execution Status Outcome Buttons (44px min-height, rounded-pill) */}
                <div className="pt-1">
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['Not Run', 'Passed', 'Failed', 'Blocked'] as const).map((st) => {
                      const isSel = cp.status === st;
                      let activeCls = 'bg-dark-chassis text-white';
                      if (st === 'Passed') activeCls = 'bg-status-positive text-dark-chassis font-bold shadow-xs';
                      if (st === 'Failed') activeCls = 'bg-status-critical text-white font-bold shadow-xs';
                      if (st === 'Blocked') activeCls = 'bg-status-warning text-dark-chassis font-bold shadow-xs';
                      if (st === 'Not Run') activeCls = 'bg-dark-chassis text-txt-muted border border-dark-chassis';

                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleUpdateStatus(cp.id, st)}
                          className={`min-h-[44px] py-2 px-1 rounded-pill text-[10px] font-semibold flex items-center justify-center gap-1 transition cursor-pointer active:scale-95 ${
                            isSel 
                              ? activeCls 
                              : 'bg-clinical-warm text-txt-secondary border border-clinical-border hover:bg-clinical-surface'
                          }`}
                        >
                          <span>{st === 'Not Run' ? 'Reset' : st}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View (hidden lg:block) */}
        <div className="hidden lg:block overflow-x-auto flex-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-clinical-surface text-txt-secondary border-b border-clinical-border font-mono text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 font-semibold">Priority</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold">Checkpoint Title</th>
                <th className="py-3 px-4 font-semibold">Test Procedure</th>
                <th className="py-3 px-4 font-semibold">Expected System Result</th>
                <th className="py-3 px-3 font-semibold">Test Data</th>
                <th className="py-3 px-4 text-right font-semibold">Execution Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-clinical-border/60">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-txt-secondary">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <ShieldCheck className="w-8 h-8 text-txt-muted opacity-40" />
                      <p className="text-xs font-bold text-dark-chassis">No QA Checkpoints Generated</p>
                      <p className="text-[11px] text-txt-muted">
                        Click &quot;Generate QA Checkpoints with AI&quot; to auto-generate test procedures and validation scenarios for this feature.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
              {filtered.map((cp) => (
                <tr key={cp.id} className="hover:bg-clinical-warm/60 transition group">
                  
                  {/* Priority */}
                  <td className="py-3 px-4 align-top whitespace-nowrap">
                    <span className={`px-2.5 py-0.5 rounded-pill text-[10px] ${priorityColor(cp.priority)}`}>
                      {cp.priority}
                    </span>
                  </td>

                  {/* Category */}
                  <td className="py-3 px-4 align-top whitespace-nowrap">
                    <span className="px-2.5 py-0.5 rounded-pill bg-clinical-warm text-dark-chassis font-medium text-[10px] border border-clinical-border">
                      {cp.category}
                    </span>
                  </td>

                  {/* Title */}
                  <td className="py-3 px-4 align-top max-w-xs font-semibold text-dark-chassis text-xs">
                    {cp.title}
                  </td>

                  {/* Test Steps */}
                  <td className="py-3 px-4 align-top max-w-sm text-txt-secondary text-[11px] whitespace-pre-line font-mono">
                    {cp.test_steps}
                  </td>

                  {/* Expected Result */}
                  <td className="py-3 px-4 align-top max-w-xs text-txt-primary text-[11px]">
                    {cp.expected_result}
                  </td>

                  {/* Test Data */}
                  <td className="py-3 px-3 align-top whitespace-nowrap text-txt-muted text-[10px] font-mono">
                    {cp.test_data_notes || 'Standard'}
                  </td>

                  {/* Execution Status Selector */}
                  <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                    <select
                      value={cp.status}
                      onChange={(e) => handleUpdateStatus(cp.id, e.target.value as any)}
                      className="px-2.5 py-1 bg-clinical-warm border border-clinical-border rounded-pill text-xs font-semibold text-dark-chassis focus:outline-none focus:border-dark-chassis cursor-pointer"
                    >
                      <option value="Not Run">Not Run</option>
                      <option value="Passed">Passed</option>
                      <option value="Failed">Failed</option>
                      <option value="Blocked">Blocked</option>
                    </select>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
