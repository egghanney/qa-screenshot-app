'use client';

import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  FileSpreadsheet,
  Sparkles, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  Save, 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Edit3, 
  RotateCcw,
  Check,
  Info,
  ExternalLink
} from 'lucide-react';
import { Feature, Project, GeneratedCharter, ScenarioCategory, ScenarioStatus } from '@/lib/types';
import { getStoredGeminiApiKey } from '@/lib/settings';
import { supabase } from '@/lib/supabase/client';

interface ImportWordChartersModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFeature: Feature | null;
  currentProject: Project | null;
  onChartersSaved: () => Promise<void>;
  onOpenRunner?: () => void;
}

export function ImportWordChartersModal({
  isOpen,
  onClose,
  currentFeature,
  currentProject,
  onChartersSaved,
  onOpenRunner
}: ImportWordChartersModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'excel' | 'word' | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [charters, setCharters] = useState<GeneratedCharter[]>([]);
  const [extractionMode, setExtractionMode] = useState<'gemini' | 'deterministic' | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [expandedCharterIdx, setExpandedCharterIdx] = useState<number | null>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const validateAndSetFile = (selected: File) => {
    const lower = selected.name.toLowerCase();
    const isXls = lower.endsWith('.xlsx') || lower.endsWith('.xls');
    const isDoc = lower.endsWith('.docx');

    if (!isXls && !isDoc) {
      setExtractError('Please select a valid Excel spreadsheet (.xlsx, .xls) or Word document (.docx).');
      return;
    }

    setFile(selected);
    setFileType(isXls ? 'excel' : 'word');
    setExtractError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleExtractCharters = async () => {
    if (!file) return;

    setIsExtracting(true);
    setExtractError(null);

    try {
      const apiKey = getStoredGeminiApiKey() || '';
      const formData = new FormData();
      formData.append('file', file);
      if (currentFeature?.id) formData.append('feature_id', currentFeature.id);
      if (currentProject?.id) formData.append('project_id', currentProject.id);
      if (apiKey) formData.append('api_key', apiKey);

      const response = await fetch('/api/charters/import-doc', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to extract charters from document.');
      }

      setCharters(data.charters || []);
      setExtractionMode(data.extractionMode || (fileType === 'excel' ? 'deterministic' : 'gemini'));
      if (data.fileType) setFileType(data.fileType);
      if (data.sheetNames) setSheetNames(data.sheetNames);
      setExpandedCharterIdx(0);
    } catch (err: any) {
      console.error('Extraction error:', err);
      setExtractError(err.message || 'An error occurred during extraction.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setFileType(null);
    setCharters([]);
    setExtractError(null);
    setExtractionMode(null);
    setSheetNames([]);
    setExpandedCharterIdx(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpdateCharterField = (idx: number, field: keyof GeneratedCharter, value: any) => {
    setCharters(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleUpdateScenario = (charterIdx: number, scenarioIdx: number, field: string, value: any) => {
    setCharters(prev => {
      const next = [...prev];
      const scenarios = [...next[charterIdx].scenarios];
      scenarios[scenarioIdx] = { ...scenarios[scenarioIdx], [field]: value };
      next[charterIdx] = { ...next[charterIdx], scenarios };
      return next;
    });
  };

  const handleAddScenario = (charterIdx: number) => {
    setCharters(prev => {
      const next = [...prev];
      const scenarios = [...next[charterIdx].scenarios];
      scenarios.push({
        prompt_id: `P-${scenarios.length + 1}`,
        prompt_text: 'Explore edge conditions or unhandled inputs in this section',
        category: 'Boundary & Edge',
        status: 'Untested',
        observations: '',
        media_url: '',
        sort_order: scenarios.length
      });
      next[charterIdx] = { ...next[charterIdx], scenarios };
      return next;
    });
  };

  const handleRemoveScenario = (charterIdx: number, scenarioIdx: number) => {
    setCharters(prev => {
      const next = [...prev];
      const scenarios = next[charterIdx].scenarios.filter((_, i) => i !== scenarioIdx);
      next[charterIdx] = { ...next[charterIdx], scenarios };
      return next;
    });
  };

  const handleRemoveCharter = (charterIdx: number) => {
    setCharters(prev => prev.filter((_, i) => i !== charterIdx));
    if (expandedCharterIdx === charterIdx) {
      setExpandedCharterIdx(null);
    }
  };

  const handleAddCharter = () => {
    const newIdx = charters.length + 1;
    setCharters(prev => [
      ...prev,
      {
        charter_code: `DOC-${String(newIdx).padStart(2, '0')}`,
        title: 'New Imported Section Charter',
        mission: 'Verify requirements and user journey behaviors.',
        user_persona: currentFeature?.user_types?.[0] ? String(currentFeature.user_types[0]) : 'Customer',
        starting_condition: 'Application ready on feature view',
        expected_outcome: 'System behaves properly under all conditions',
        scope: 'feature' as const,
        status: 'Active' as const,
        project_id: currentProject?.id || '',
        scenarios: [
          {
            prompt_id: 'P-1',
            prompt_text: 'Verify golden path workflow',
            category: 'Golden Path' as ScenarioCategory,
            status: 'Untested' as const,
            observations: '',
            media_url: '',
            sort_order: 0
          }
        ]
      }
    ]);
    setExpandedCharterIdx(charters.length);
  };

  const handleSaveCharters = async (triggerRun: boolean = false) => {
    if (charters.length === 0) return;
    setIsSaving(true);
    setExtractError(null);

    try {
      const projectId = currentProject?.id || null;
      const featureId = currentFeature?.id || null;

      for (let i = 0; i < charters.length; i++) {
        const c = charters[i];

        // 1. Insert Charter
        const { data: savedCharter, error: cErr } = await supabase
          .from('qa_charters')
          .insert({
            project_id: projectId,
            feature_id: featureId,
            charter_code: c.charter_code || `ET-${String(i + 1).padStart(2, '0')}`,
            title: c.title || 'Imported Charter',
            mission: c.mission || '',
            user_persona: c.user_persona || 'Customer',
            starting_condition: c.starting_condition || '',
            expected_outcome: c.expected_outcome || '',
            scope: c.scope || 'feature',
            status: 'Active'
          })
          .select('id')
          .single();

        if (cErr) throw cErr;

        // 2. Insert Scenarios (qa_charter_scenarios has columns: charter_id, prompt_id, prompt_text, status, observations, media_url, sort_order)
        if (c.scenarios && c.scenarios.length > 0 && savedCharter) {
          const scenarioRows = c.scenarios.map((s, sIdx) => ({
            charter_id: savedCharter.id,
            prompt_id: s.prompt_id || `P-${sIdx + 1}`,
            prompt_text: s.prompt_text || '',
            status: s.status || 'Untested',
            observations: s.observations || '',
            media_url: s.media_url || '',
            sort_order: sIdx
          }));

          const { error: sErr } = await supabase
            .from('qa_charter_scenarios')
            .insert(scenarioRows);

          if (sErr) throw sErr;
        }
      }

      // 3. Persist scenario categories in feature's advanced_context if featureId is present
      if (featureId) {
        try {
          const { data: feat } = await supabase
            .from('qa_features')
            .select('advanced_context')
            .eq('id', featureId)
            .single();

          const advContext = feat?.advanced_context || {};
          const traceMap = { ...(advContext.latest_traceability_map || {}) };

          charters.forEach(c => {
            c.scenarios?.forEach(s => {
              if (s.prompt_id) {
                traceMap[s.prompt_id] = {
                  ...(traceMap[s.prompt_id] || {}),
                  category: s.category || 'Golden Path'
                };
              }
            });
          });

          await supabase
            .from('qa_features')
            .update({
              advanced_context: {
                ...advContext,
                latest_traceability_map: traceMap
              }
            })
            .eq('id', featureId);
        } catch (ctxErr) {
          console.warn('Could not sync category metadata to feature advanced_context:', ctxErr);
        }
      }

      setSaveSuccess(true);
      await onChartersSaved();

      setTimeout(() => {
        setIsSaving(false);
        setSaveSuccess(false);
        onClose();
        if (triggerRun && onOpenRunner) {
          onOpenRunner();
        }
      }, 500);

    } catch (err: any) {
      console.error('Failed to save imported charters:', err);
      setExtractError(err.message || 'Failed to save charters to database.');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in-50">
      <div 
        className="bg-white rounded-[24px] border border-clinical-border shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-dark-chassis"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-clinical-border bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
              fileType === 'excel' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                : 'bg-blue-50 border-blue-200 text-blue-600'
            }`}>
              {fileType === 'excel' ? <FileSpreadsheet className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold tracking-tight">Import Charters (Excel / Word)</h2>
                {fileType === 'excel' ? (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 bg-emerald-50 text-emerald-700 border-emerald-300">
                    <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                    Excel Deterministic Parse
                  </span>
                ) : extractionMode ? (
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 ${
                    extractionMode === 'gemini' 
                      ? 'bg-purple-50 text-purple-700 border-purple-300' 
                      : 'bg-amber-50 text-amber-700 border-amber-300'
                  }`}>
                    {extractionMode === 'gemini' ? (
                      <>
                        <Sparkles className="w-3 h-3 text-purple-600" />
                        AI Synthesized
                      </>
                    ) : (
                      <>
                        <Layers className="w-3 h-3 text-amber-600" />
                        Structural Parse
                      </>
                    )}
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-txt-muted">
                Extract requirements, heuristics, and test scenarios from your Excel spreadsheets (.xlsx, .xls) or Word specifications (.docx).
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Error Banner */}
          {extractError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1">
                <span className="font-semibold">Error: </span>
                {extractError}
              </div>
            </div>
          )}

          {/* Step 1: File Selection / Upload Area */}
          {charters.length === 0 ? (
            <div className="space-y-4">
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
                  file
                    ? fileType === 'excel'
                      ? 'border-emerald-500 bg-emerald-50/30'
                      : 'border-blue-500 bg-blue-50/30'
                    : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50/50 bg-slate-50/20'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx,.xls,.docx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                />

                <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shadow-xs ${
                  fileType === 'excel'
                    ? 'bg-emerald-100/70 border-emerald-200 text-emerald-600'
                    : fileType === 'word'
                    ? 'bg-blue-100/70 border-blue-200 text-blue-600'
                    : 'bg-slate-100 border-slate-200 text-slate-500'
                }`}>
                  {fileType === 'excel' ? (
                    <FileSpreadsheet className="w-7 h-7" />
                  ) : fileType === 'word' ? (
                    <FileText className="w-7 h-7" />
                  ) : (
                    <Upload className="w-7 h-7" />
                  )}
                </div>

                {file ? (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-dark-chassis">{file.name}</p>
                    <p className="text-xs text-txt-muted">
                      {(file.size / 1024).toFixed(1)} KB • {fileType === 'excel' ? 'Excel Spreadsheet' : 'Word Document'} • Ready to extract
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-dark-chassis">
                      Click to upload or drag &amp; drop your Excel or Word file
                    </p>
                    <p className="text-xs text-txt-muted">
                      Supports Excel workbooks (<strong>.xlsx</strong>, <strong>.xls</strong>) and Word documents (<strong>.docx</strong>)
                    </p>
                  </div>
                )}
              </div>

              {/* Target Scope Information */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-clinical-border flex items-center justify-between text-xs text-txt-muted">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>
                    Importing into target feature:{' '}
                    <strong className="text-dark-chassis font-semibold">
                      {currentFeature?.name || 'Current Feature'}
                    </strong>
                  </span>
                </div>
                {file && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReset();
                    }}
                    className="text-xs text-rose-600 hover:underline flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Change file
                  </button>
                )}
              </div>

              {/* Extract Action Button */}
              {file && (
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleExtractCharters}
                    disabled={isExtracting}
                    className={`px-5 py-2.5 rounded-pill text-xs font-bold flex items-center gap-2 shadow-sm transition disabled:opacity-50 ${
                      fileType === 'excel'
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-neon hover:bg-neon-bright text-dark-chassis'
                    }`}
                  >
                    {isExtracting ? (
                      <>
                        <Sparkles className="w-4 h-4 animate-spin" />
                        Extracting Charters...
                      </>
                    ) : (
                      <>
                        {fileType === 'excel' ? (
                          <FileSpreadsheet className="w-4 h-4" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        <span>
                          {fileType === 'excel' ? 'Extract Charters from Excel' : 'Extract Charters with AI'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Step 2: Extracted Charters Review & Customization */
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-1 border-b border-clinical-border">
                <div className="flex items-center gap-2 text-xs text-txt-muted">
                  <span>
                    Found <strong className="text-dark-chassis">{charters.length}</strong> charter{charters.length !== 1 ? 's' : ''} with{' '}
                    <strong className="text-dark-chassis">
                      {charters.reduce((acc, c) => acc + (c.scenarios?.length || 0), 0)}
                    </strong>{' '}
                    total exploration scenarios
                  </span>
                  {sheetNames.length > 1 && (
                    <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                      across {sheetNames.length} sheets
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddCharter}
                    className="px-2.5 py-1 rounded-pill bg-slate-100 hover:bg-slate-200 text-xs font-medium text-dark-chassis flex items-center gap-1 transition"
                  >
                    <Plus className="w-3 h-3" /> Add Charter
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-2.5 py-1 rounded-pill bg-slate-100 hover:bg-slate-200 text-xs font-medium text-dark-chassis flex items-center gap-1 transition"
                  >
                    <RotateCcw className="w-3 h-3" /> Re-upload
                  </button>
                </div>
              </div>

              {/* Charter List Accordion */}
              <div className="space-y-3">
                {charters.map((charter, cIdx) => {
                  const isExpanded = expandedCharterIdx === cIdx;
                  return (
                    <div 
                      key={cIdx} 
                      className="border border-clinical-border rounded-xl bg-white shadow-2xs overflow-hidden transition"
                    >
                      {/* Accordion Header */}
                      <div 
                        onClick={() => setExpandedCharterIdx(isExpanded ? null : cIdx)}
                        className="p-3.5 bg-slate-50/70 hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-3 border-b border-clinical-border"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="font-mono text-xs font-bold text-dark-secondary bg-slate-200/80 px-2 py-0.5 rounded-md">
                            {charter.charter_code || `ET-${cIdx + 1}`}
                          </span>
                          <span className="font-bold text-xs text-dark-chassis truncate">
                            {charter.title}
                          </span>
                          <span className="text-[11px] text-txt-muted font-mono px-1.5 py-0.5 rounded bg-white border border-clinical-border">
                            {charter.scenarios?.length || 0} scenarios
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveCharter(cIdx);
                            }}
                            className="p-1 hover:bg-rose-100 text-txt-muted hover:text-rose-600 rounded transition"
                            title="Delete charter"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-txt-muted" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-txt-muted" />
                          )}
                        </div>
                      </div>

                      {/* Accordion Content */}
                      {isExpanded && (
                        <div className="p-4 space-y-4 bg-white text-xs">
                          {/* Top row: Title & Code */}
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div className="sm:col-span-1">
                              <label className="block text-[11px] font-bold text-txt-muted mb-1">Code</label>
                              <input
                                type="text"
                                value={charter.charter_code}
                                onChange={(e) => handleUpdateCharterField(cIdx, 'charter_code', e.target.value)}
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:border-dark-chassis outline-hidden"
                              />
                            </div>
                            <div className="sm:col-span-3">
                              <label className="block text-[11px] font-bold text-txt-muted mb-1">Charter Title</label>
                              <input
                                type="text"
                                value={charter.title}
                                onChange={(e) => handleUpdateCharterField(cIdx, 'title', e.target.value)}
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:border-dark-chassis outline-hidden"
                              />
                            </div>
                          </div>

                          {/* Mission */}
                          <div>
                            <label className="block text-[11px] font-bold text-txt-muted mb-1">Mission</label>
                            <textarea
                              rows={2}
                              value={charter.mission}
                              onChange={(e) => handleUpdateCharterField(cIdx, 'mission', e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:border-dark-chassis outline-hidden"
                            />
                          </div>

                          {/* Persona, Starting Condition, Expected Outcome */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-txt-muted mb-1">Persona</label>
                              <input
                                type="text"
                                value={charter.user_persona || ''}
                                onChange={(e) => handleUpdateCharterField(cIdx, 'user_persona', e.target.value)}
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:border-dark-chassis outline-hidden"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-txt-muted mb-1">Starting Condition</label>
                              <input
                                type="text"
                                value={charter.starting_condition || ''}
                                onChange={(e) => handleUpdateCharterField(cIdx, 'starting_condition', e.target.value)}
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:border-dark-chassis outline-hidden"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-txt-muted mb-1">Expected Outcome</label>
                              <input
                                type="text"
                                value={charter.expected_outcome || ''}
                                onChange={(e) => handleUpdateCharterField(cIdx, 'expected_outcome', e.target.value)}
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:border-dark-chassis outline-hidden"
                              />
                            </div>
                          </div>

                          {/* Scenarios Table */}
                          <div className="pt-2">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] font-bold text-txt-muted uppercase tracking-wider">
                                Scenarios &amp; Prompts ({charter.scenarios.length})
                              </span>
                              <button
                                onClick={() => handleAddScenario(cIdx)}
                                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" /> Add Scenario
                              </button>
                            </div>

                            <div className="space-y-2.5">
                              {charter.scenarios.map((scenario, sIdx) => (
                                <div 
                                  key={sIdx}
                                  className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col gap-2"
                                >
                                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                      <span className="font-mono text-[10px] text-txt-muted px-1.5 py-0.5 rounded bg-white border border-slate-200 shrink-0">
                                        {scenario.prompt_id || `P-${sIdx + 1}`}
                                      </span>
                                      <select
                                        value={scenario.category}
                                        onChange={(e) => handleUpdateScenario(cIdx, sIdx, 'category', e.target.value as ScenarioCategory)}
                                        className="text-[11px] font-medium px-2 py-1 border border-slate-200 rounded bg-white text-dark-chassis outline-hidden shrink-0"
                                      >
                                        <option value="Golden Path">Golden Path</option>
                                        <option value="Alternative Flow">Alternative Flow</option>
                                        <option value="Boundary & Edge">Boundary &amp; Edge</option>
                                        <option value="Failure & Recovery">Failure &amp; Recovery</option>
                                      </select>
                                      <select
                                        value={scenario.status || 'Untested'}
                                        onChange={(e) => handleUpdateScenario(cIdx, sIdx, 'status', e.target.value as ScenarioStatus)}
                                        className={`text-[11px] font-bold px-2 py-1 border rounded outline-hidden shrink-0 ${
                                          scenario.status === 'Pass'
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                            : scenario.status === 'Fail'
                                            ? 'bg-rose-50 text-rose-700 border-rose-300'
                                            : scenario.status === 'Blocked'
                                            ? 'bg-amber-50 text-amber-700 border-amber-300'
                                            : 'bg-white text-dark-chassis border-slate-200'
                                        }`}
                                      >
                                        <option value="Untested">Untested</option>
                                        <option value="Pass">Pass</option>
                                        <option value="Fail">Fail</option>
                                        <option value="Blocked">Blocked</option>
                                      </select>
                                    </div>

                                    <input
                                      type="text"
                                      value={scenario.prompt_text}
                                      onChange={(e) => handleUpdateScenario(cIdx, sIdx, 'prompt_text', e.target.value)}
                                      className="flex-1 w-full px-2.5 py-1 border border-slate-200 rounded bg-white text-xs text-dark-chassis focus:border-dark-chassis outline-hidden"
                                      placeholder="Enter scenario test prompt..."
                                    />

                                    <button
                                      onClick={() => handleRemoveScenario(cIdx, sIdx)}
                                      className="p-1 hover:bg-rose-100 text-txt-muted hover:text-rose-600 rounded transition shrink-0"
                                      title="Delete scenario"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  {/* Observations or Evidence URL row if present */}
                                  {(scenario.observations || scenario.media_url) && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 text-[11px]">
                                      {scenario.observations && (
                                        <div className="text-txt-muted">
                                          <span className="font-semibold text-dark-secondary">Notes: </span>
                                          <input
                                            type="text"
                                            value={scenario.observations}
                                            onChange={(e) => handleUpdateScenario(cIdx, sIdx, 'observations', e.target.value)}
                                            className="w-full px-2 py-0.5 border border-slate-200 rounded bg-white text-xs text-dark-chassis focus:border-dark-chassis outline-hidden mt-0.5"
                                            placeholder="Notes..."
                                          />
                                        </div>
                                      )}
                                      {scenario.media_url && (
                                        <div className="text-txt-muted">
                                          <span className="font-semibold text-dark-secondary">Media URL: </span>
                                          <input
                                            type="text"
                                            value={scenario.media_url}
                                            onChange={(e) => handleUpdateScenario(cIdx, sIdx, 'media_url', e.target.value)}
                                            className="w-full px-2 py-0.5 border border-slate-200 rounded bg-white text-xs text-dark-chassis focus:border-dark-chassis outline-hidden mt-0.5"
                                            placeholder="https://..."
                                          />
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-clinical-border bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-pill border border-clinical-border bg-white hover:bg-slate-100 text-xs font-medium text-dark-chassis transition"
          >
            Cancel
          </button>

          {charters.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSaveCharters(false)}
                disabled={isSaving || saveSuccess}
                className="px-4 py-2 rounded-pill bg-white border border-slate-300 hover:bg-slate-100 text-dark-chassis text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs disabled:opacity-50"
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 text-dark-secondary" />
                    {isSaving ? 'Saving...' : 'Save to Feature'}
                  </>
                )}
              </button>

              <button
                onClick={() => handleSaveCharters(true)}
                disabled={isSaving || saveSuccess}
                className="px-5 py-2 rounded-pill bg-neon hover:bg-neon-bright text-dark-chassis text-xs font-bold flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-dark-chassis text-dark-chassis" />
                <span>Save &amp; Run Immediately</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
