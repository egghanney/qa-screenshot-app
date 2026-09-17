'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  LayoutGrid, 
  Upload, 
  Download, 
  Save, 
  Trash2, 
  X, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  CornerDownRight, 
  Edit3, 
  Camera, 
  Smartphone, 
  Eye, 
  Layers, 
  Check, 
  ArrowRight,
  Sparkles,
  RefreshCw,
  FolderPlus,
  AlertCircle,
  GripVertical,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Sliders,
  ShieldAlert,
  Users,
  Compass,
  Cpu,
  FileText,
  Bot
} from 'lucide-react';
import { StoryboardScreen, Project, StoryboardExecutiveContext, StoryboardPillarKey, KnowledgeCategory } from '@/lib/types';
import { 
  computeStepBadges, 
  exportStoryboardMasterImage, 
  exportStoryboardInSetsOf10 
} from '@/lib/storyboard/storyboardGridExporter';
import { ScreenActionEditorDrawer } from '@/components/storyboard/ScreenActionEditorDrawer';
import { LiveScreenCaptureModal } from '@/components/capture/LiveScreenCaptureModal';
import { ChatGPTExportModal } from '@/components/storyboard/ChatGPTExportModal';
import { SnappedScreen } from '@/lib/capture/useScreenCapture';
import { supabase } from '@/lib/supabase/client';

interface QuickStoryboardStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects?: Project[];
  onFeatureCreated?: (featureId: string, projectId: string) => void;
}

export function QuickStoryboardStudioModal({
  isOpen,
  onClose,
  projects = [],
  onFeatureCreated
}: QuickStoryboardStudioModalProps) {
  const [flowTitle, setFlowTitle] = useState('New User Flow');
  const [screens, setScreens] = useState<StoryboardScreen[]>([]);
  const [selectedScreenForEdit, setSelectedScreenForEdit] = useState<StoryboardScreen | null>(null);
  const [previewScreen, setPreviewScreen] = useState<StoryboardScreen | null>(null);

  // Drag and drop rearrange state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Exporter Dialog State
  const [isExporting, setIsExporting] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [includeActionsInExport, setIncludeActionsInExport] = useState(true);
  const [includeContextInExport, setIncludeContextInExport] = useState(true);
  const [isChatGptModalOpen, setIsChatGptModalOpen] = useState(false);

  // 8-Pillar Executive Flow Context State
  const [isExecutiveCardOpen, setIsExecutiveCardOpen] = useState(false);
  const [executiveContext, setExecutiveContext] = useState<StoryboardExecutiveContext>({
    featuresAndServices: '',
    userTypes: '',
    journeysAndNavigation: '',
    interactionReference: '',
    businessRules: '',
    systemFailureStates: '',
    communicationsDependencies: '',
    historicalKnowledgeRisk: ''
  });

  // Live Screen Capture Integration State
  const [isLiveCaptureOpen, setIsLiveCaptureOpen] = useState(false);

  // Save as Permanent Feature Flow State
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || 'new');
  const [newProjectName, setNewProjectName] = useState('');
  const [saveFeatureName, setSaveFeatureName] = useState('');
  const [isSavingToDb, setIsSavingToDb] = useState(false);
  const [saveStatusText, setSaveStatusText] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Recompute sequential badges whenever screens change
  const computedScreens = useMemo(() => computeStepBadges(screens), [screens]);

  // Count populated context pillars
  const definedPillarsCount = useMemo(() => {
    return Object.values(executiveContext).filter(v => typeof v === 'string' && v.trim().length > 0).length;
  }, [executiveContext]);

  // Load draft from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedTitle = localStorage.getItem('qa_storyboard_title');
      if (savedTitle) setFlowTitle(savedTitle);

      const savedCtx = localStorage.getItem('qa_storyboard_context');
      if (savedCtx) {
        setExecutiveContext(JSON.parse(savedCtx));
      }
    } catch (e) {}
  }, []);

  // Sync title to draft
  const handleTitleChange = (newVal: string) => {
    setFlowTitle(newVal);
    try {
      localStorage.setItem('qa_storyboard_title', newVal);
    } catch (e) {}
  };

  // Sync executive context to draft
  const handleUpdateContext = (key: keyof StoryboardExecutiveContext, val: string) => {
    setExecutiveContext(prev => {
      const updated = { ...prev, [key]: val };
      try {
        localStorage.setItem('qa_storyboard_context', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  if (!isOpen) return null;

  // Process incoming image files into StoryboardScreen items
  const handleAddFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (fileArray.length === 0) return;

    const newItems: StoryboardScreen[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const previewUrl = URL.createObjectURL(file);
      const timestamp = Date.now() + i;

      // Extract natural dimensions
      const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth || 1080, height: img.naturalHeight || 1920 });
        img.onerror = () => resolve({ width: 1080, height: 1920 });
        img.src = previewUrl;
      });

      const baseName = file.name.replace(/\.[^/.]+$/, '').trim() || `Step ${screens.length + i + 1}`;

      newItems.push({
        id: `story_${timestamp}_${Math.random().toString(36).substring(2, 6)}`,
        file,
        previewUrl,
        name: baseName,
        isSubScreen: false,
        stepBadge: `#${screens.length + i + 1}`,
        actions: [],
        expectedResult: '',
        width: dimensions.width,
        height: dimensions.height
      });
    }

    setScreens(prev => [...prev, ...newItems]);
  };

  // Live Screen Capture Callback
  const handleLiveCaptureScreens = (snapped: SnappedScreen[]) => {
    const newItems: StoryboardScreen[] = snapped.map((s, idx) => ({
      id: `story_${s.timestamp}_${idx}`,
      file: s.file,
      previewUrl: s.previewUrl,
      name: s.name || `Step ${screens.length + idx + 1}`,
      isSubScreen: false,
      stepBadge: `#${screens.length + idx + 1}`,
      actions: [],
      expectedResult: '',
      width: s.width,
      height: s.height
    }));

    setScreens(prev => [...prev, ...newItems]);
    setIsLiveCaptureOpen(false);
  };

  // Reorder screen position with button nudge
  const handleMoveScreen = (index: number, direction: 'left' | 'right') => {
    const targetIdx = direction === 'left' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= screens.length) return;
    const updated = [...screens];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;

    // First screen must always remain Level 0
    if (updated[0].nestLevel && updated[0].nestLevel > 0) {
      updated[0] = { ...updated[0], nestLevel: 0, isSubScreen: false };
    }
    setScreens(updated);
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent, index: number) => {
    if (dragOverIndex === index) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIdxStr = e.dataTransfer.getData('text/plain');
    const sourceIndex = sourceIdxStr !== '' ? parseInt(sourceIdxStr, 10) : draggedIndex;

    if (
      sourceIndex !== null && 
      sourceIndex !== undefined && 
      !isNaN(sourceIndex) && 
      sourceIndex !== targetIndex
    ) {
      const updated = [...screens];
      const [movedItem] = updated.splice(sourceIndex, 1);
      updated.splice(targetIndex, 0, movedItem);

      // First screen must always remain Level 0
      if (updated[0].nestLevel && updated[0].nestLevel > 0) {
        updated[0] = { ...updated[0], nestLevel: 0, isSubScreen: false };
      }
      setScreens(updated);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Set 3-tier hierarchy level (0: Primary, 1: Sub-Screen, 2: Sub of Sub)
  const handleSetNestLevel = (index: number, level: number) => {
    if (index === 0) return; // First screen cannot be nested
    const clamped = Math.max(0, Math.min(2, level));
    const updated = [...screens];
    updated[index] = {
      ...updated[index],
      nestLevel: clamped,
      isSubScreen: clamped > 0
    };
    setScreens(updated);
  };

  // Toggle sub-screen nesting (legacy compatibility)
  const handleToggleSubScreen = (index: number) => {
    if (index === 0) return;
    const current = screens[index].nestLevel ?? (screens[index].isSubScreen ? 1 : 0);
    const next = current === 0 ? 1 : 0;
    handleSetNestLevel(index, next);
  };

  // Delete screen
  const handleDeleteScreen = (id: string) => {
    setScreens(prev => {
      const target = prev.find(s => s.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter(s => s.id !== id);
    });
  };

  // Clear all screens
  const handleClearAll = () => {
    if (screens.length === 0) return;
    if (confirm('Clear all screens in this storyboard?')) {
      screens.forEach(s => {
        if (s.previewUrl) URL.revokeObjectURL(s.previewUrl);
      });
      setScreens([]);
    }
  };

  // Download Storyboard Handler
  const handleDownloadStoryboard = async (mode: 'sets_of_10' | 'master') => {
    if (computedScreens.length === 0) return;
    setIsExporting(true);
    setIsExportMenuOpen(false);

    try {
      if (mode === 'sets_of_10') {
        await exportStoryboardInSetsOf10(computedScreens, {
          title: flowTitle,
          includeActions: includeActionsInExport,
          theme: 'light',
          context: executiveContext,
          includeContext: includeContextInExport
        });
      } else {
        await exportStoryboardMasterImage(computedScreens, {
          title: flowTitle,
          includeActions: includeActionsInExport,
          theme: 'light',
          context: executiveContext,
          includeContext: includeContextInExport
        });
      }
    } catch (err) {
      console.error('Failed exporting storyboard grid:', err);
      alert('Failed to generate image. Check console for details.');
    } finally {
      setIsExporting(false);
    }
  };

  // Save Storyboard to permanent Supabase Feature & User Journey
  const handleSaveToPermanentFeature = async () => {
    if (computedScreens.length === 0) return;
    const featureName = saveFeatureName.trim() || flowTitle.trim() || 'New Storyboard Flow';
    setIsSavingToDb(true);
    setSaveStatusText('Preparing workspace and feature...');

    try {
      let projectId = selectedProjectId;

      // 1. Create project if "new" selected
      if (projectId === 'new') {
        const projName = newProjectName.trim() || 'Mobile Applications';
        const { data: newProj, error: pErr } = await supabase
          .from('qa_projects')
          .insert({
            name: projName,
            platform: 'Mobile Web',
            description: `${projName} Workspace`
          })
          .select('id')
          .single();
        if (pErr) throw pErr;
        projectId = newProj.id;
      }

      // 2. Create feature
      const { data: newFeature, error: fErr } = await supabase
        .from('qa_features')
        .insert({
          project_id: projectId,
          name: featureName,
          description: `Storyboard flow with ${computedScreens.length} screens.`,
          purpose: 'Feature user journey and interaction flow',
          user_types: ['Customer'],
          entry_point: computedScreens[0]?.name || 'App Launch',
          status: 'draft'
        })
        .select('id')
        .single();
      if (fErr) throw fErr;

      const featureId = newFeature.id;

      // 3. Upload screens & insert qa_screens
      for (let i = 0; i < computedScreens.length; i++) {
        setSaveStatusText(`Uploading screen ${i + 1} of ${computedScreens.length}...`);
        const item = computedScreens[i];
        const screenNumber = i + 1;
        const filePath = `${featureId}/screen-${screenNumber}-${Date.now()}.png`;

        let finalImageUrl = item.previewUrl;
        let storagePath: string | null = null;

        if (item.file) {
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('qa_screenshots')
            .upload(filePath, item.file, { cacheControl: '3600', upsert: true });

          if (!uploadErr && uploadData) {
            storagePath = uploadData.path;
            const { data: publicUrlData } = supabase.storage
              .from('qa_screenshots')
              .getPublicUrl(uploadData.path);
            if (publicUrlData?.publicUrl) {
              finalImageUrl = publicUrlData.publicUrl;
            }
          }
        }

        // Format actions text
        const actionStr = item.actions.length > 0
          ? item.actions.map((a, idx) => {
              const sectionTag = a.section ? `[${a.section}] ` : '';
              const prefix = a.role === 'optional'
                ? '• [Optional]'
                : a.role === 'exit'
                ? '⤶ [Exit]'
                : a.role === 'link'
                ? '↗ [Link]'
                : `${idx + 1}.`;
              return `${prefix} ${sectionTag}[${a.type || 'tap'}] ${a.description}`;
            }).join(' • ')
          : `User interactions on ${item.name}`;

        await supabase.from('qa_screens').insert({
          feature_id: featureId,
          screen_number: screenNumber,
          name: item.name || `Screen ${screenNumber}`,
          image_url: finalImageUrl,
          storage_path: storagePath,
          user_action: actionStr,
          expected_behavior: item.expectedResult || 'System advances to next state',
          state: 'normal',
          notes: item.isSubScreen ? (item.nestLevel === 2 ? `Sub-step Level 2 (${item.stepBadge})` : `Sub-step (${item.stepBadge})`) : null
        });
      }

      // 3.5 Sync Executive Context Matrix to qa_knowledge_items
      const categoryMap: Array<{ key: StoryboardPillarKey; category: KnowledgeCategory; defaultTitle: string }> = [
        { key: 'featuresAndServices', category: 'Features & Services', defaultTitle: 'Core Capabilities & Services' },
        { key: 'userTypes', category: 'User Types', defaultTitle: 'Target User Roles & Personas' },
        { key: 'journeysAndNavigation', category: 'Journeys & Navigation', defaultTitle: 'Navigation & Flow Triggers' },
        { key: 'interactionReference', category: 'Interaction & Configuration Reference', defaultTitle: 'Interaction & Configuration Rules' },
        { key: 'businessRules', category: 'Business Rules & Constraints', defaultTitle: 'Business Rules & Threshold Limits' },
        { key: 'systemFailureStates', category: 'System & Failure States', defaultTitle: 'System & Exception States' },
        { key: 'communicationsDependencies', category: 'Communications & Dependencies', defaultTitle: 'Communications & System Hooks' },
        { key: 'historicalKnowledgeRisk', category: 'Historical Knowledge & Risk', defaultTitle: 'Historical Regression & Risk Areas' }
      ];

      for (const mapItem of categoryMap) {
        const text = executiveContext[mapItem.key]?.trim();
        if (text) {
          await supabase.from('qa_knowledge_items').insert({
            feature_id: featureId,
            category: mapItem.category,
            title: mapItem.defaultTitle,
            content: text,
            source: 'User',
            confidence: 'CONFIRMED',
            verification_status: 'Verified',
            notes: 'Manual executive specification from Quick Storyboard Studio'
          });
        }
      }

      // 4. Trigger Visual User Journey generation
      setSaveStatusText('Constructing Visual User Journey DAG...');
      await fetch('/api/journey/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature_id: featureId })
      });

      setIsSaveModalOpen(false);
      onClose();

      if (onFeatureCreated) {
        onFeatureCreated(featureId, projectId);
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      console.error('Failed to save storyboard as feature:', err);
      alert('Failed saving feature: ' + (err.message || 'Check console'));
    } finally {
      setIsSavingToDb(false);
      setSaveStatusText(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-dark-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-7xl h-[92vh] flex flex-col bg-dark-chassis text-white rounded-[28px] sm:rounded-[32px] border border-dark-secondary shadow-modal overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Top Header Bar */}
        <header className="px-4 sm:px-6 py-3.5 border-b border-dark-secondary flex flex-wrap items-center justify-between gap-3 shrink-0 bg-dark-chassis">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-neon text-dark-chassis flex items-center justify-center font-bold text-xs shadow-sm shadow-neon/30 shrink-0">
              <LayoutGrid className="w-4 h-4 stroke-[2.5]" />
            </div>
            
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={flowTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Untitled Storyboard Flow"
                  className="bg-transparent font-bold text-sm sm:text-base text-white hover:bg-dark-secondary/50 focus:bg-dark-secondary px-2 py-0.5 rounded-lg border border-transparent focus:border-neon focus:outline-none transition truncate max-w-[200px] sm:max-w-md"
                />
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-dark-secondary text-neon border border-neon/30 shrink-0">
                  {computedScreens.length} {computedScreens.length === 1 ? 'Screen' : 'Screens'}
                </span>
              </div>
              <p className="text-[11px] text-txt-muted truncate hidden sm:block">
                Local Storyboard Studio • Sequence screens, nest sub-steps, add actions & download grid
              </p>
            </div>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Live Capture Button */}
            <button
              type="button"
              onClick={() => setIsLiveCaptureOpen(true)}
              className="px-3 py-1.5 rounded-pill bg-dark-secondary hover:bg-dark-tertiary text-white text-xs font-semibold flex items-center gap-1.5 transition border border-dark-tertiary cursor-pointer"
              title="Snap live from screen, emulator, or mobile"
            >
              <Camera className="w-3.5 h-3.5 text-neon" />
              <span className="hidden md:inline">Live Capture</span>
            </button>

            {/* Mobile / Local Select */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-pill bg-dark-secondary hover:bg-dark-tertiary text-white text-xs font-semibold flex items-center gap-1.5 transition border border-dark-tertiary cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-neon" />
              <span className="hidden md:inline">Add Screenshots</span>
              <span className="md:hidden">Add</span>
            </button>

            {/* Save to Permanent Feature */}
            {computedScreens.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSaveFeatureName(flowTitle);
                  setIsSaveModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-pill bg-dark-secondary hover:bg-dark-tertiary text-txt-secondary hover:text-white text-xs font-semibold flex items-center gap-1.5 transition border border-dark-tertiary cursor-pointer"
                title="Promote this storyboard into a permanent Supabase workspace feature"
              >
                <Save className="w-3.5 h-3.5 text-neon" />
                <span className="hidden lg:inline">Save as Feature</span>
              </button>
            )}

            {/* ChatGPT Prompt Pack Action Button */}
            {computedScreens.length > 0 && (
              <button
                type="button"
                onClick={() => setIsChatGptModalOpen(true)}
                className="px-3.5 py-1.5 rounded-pill bg-[#10A37F] hover:bg-[#1A7F64] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-[#10A37F]/30 cursor-pointer active:scale-95 shrink-0"
                title="Generate 27-Charter Suite using ChatGPT"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>ChatGPT Pack</span>
              </button>
            )}

            {/* Download Storyboard Dropdown */}
            {computedScreens.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                  disabled={isExporting}
                  className="px-4 py-1.5 rounded-pill bg-neon hover:bg-neon-bright text-dark-chassis text-xs font-bold transition flex items-center gap-1.5 shadow-card cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  {isExporting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                  )}
                  <span>Download Grid</span>
                </button>

                {isExportMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-dark-secondary border border-dark-tertiary shadow-2xl p-3 space-y-2.5 z-30 animate-in fade-in zoom-in-95">
                    <div className="text-[11px] font-bold text-white uppercase tracking-wider pb-1 border-b border-dark-tertiary">
                      Export Storyboard Image
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDownloadStoryboard('sets_of_10')}
                      className="w-full text-left p-2 rounded-xl bg-dark-chassis hover:bg-neon/10 border border-dark-tertiary hover:border-neon/40 transition group cursor-pointer"
                    >
                      <div className="text-xs font-bold text-white group-hover:text-neon flex items-center justify-between">
                        <span>Download in Sets of 10</span>
                        <span className="text-[10px] font-mono text-neon font-bold">2 × 5 Grid</span>
                      </div>
                      <p className="text-[10px] text-txt-muted mt-0.5 leading-tight">
                        Splits into clean 10-screen cards (like your reference image)
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadStoryboard('master')}
                      className="w-full text-left p-2 rounded-xl bg-dark-chassis hover:bg-neon/10 border border-dark-tertiary hover:border-neon/40 transition group cursor-pointer"
                    >
                      <div className="text-xs font-bold text-white group-hover:text-neon flex items-center justify-between">
                        <span>Download 1 Master Image</span>
                        <span className="text-[10px] font-mono text-txt-muted">All {computedScreens.length}</span>
                      </div>
                      <p className="text-[10px] text-txt-muted mt-0.5 leading-tight">
                        Continuous multi-row composite image of full flow
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsExportMenuOpen(false);
                        setIsChatGptModalOpen(true);
                      }}
                      className="w-full text-left p-2 rounded-xl bg-dark-chassis hover:bg-[#10A37F]/15 border border-[#10A37F]/40 hover:border-[#10A37F] transition group cursor-pointer"
                    >
                      <div className="text-xs font-bold text-white group-hover:text-[#10A37F] flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Bot className="w-3.5 h-3.5 text-[#10A37F]" />
                          <span>ChatGPT Prompt Pack</span>
                        </span>
                        <span className="text-[10px] font-mono text-neon font-bold">27 Charters</span>
                      </div>
                      <p className="text-[10px] text-txt-muted mt-0.5 leading-tight">
                        Copy Senior QA prompt pack + evidence index for ChatGPT
                      </p>
                    </button>

                    <div className="pt-2 border-t border-dark-tertiary space-y-1.5">
                      <label className="text-[11px] text-txt-secondary cursor-pointer flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={includeActionsInExport}
                          onChange={(e) => setIncludeActionsInExport(e.target.checked)}
                          className="rounded accent-neon"
                        />
                        <span>Print User Actions & Results</span>
                      </label>
                      <label className="text-[11px] text-txt-secondary cursor-pointer flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={includeContextInExport}
                          onChange={(e) => setIncludeContextInExport(e.target.checked)}
                          className="rounded accent-neon"
                        />
                        <span>Print Executive Context ({definedPillarsCount}/8)</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Clear Button */}
            {computedScreens.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="p-1.5 rounded-full hover:bg-rose-500/20 text-txt-muted hover:text-rose-400 transition cursor-pointer"
                title="Clear all screens"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-dark-secondary text-txt-muted hover:text-white transition cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Studio Main Workspace */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-dark-black/40">
          
          {/* Empty Drop Zone */}
          {computedScreens.length === 0 ? (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-4 p-8 rounded-3xl border-2 border-dashed border-dark-tertiary/60 bg-dark-secondary/20 animate-in fade-in">
              <div className="w-16 h-16 rounded-full bg-dark-secondary border border-neon/40 flex items-center justify-center text-neon shadow-lg shadow-neon/15">
                <LayoutGrid className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <h3 className="font-bold text-base sm:text-lg text-white">
                  Drop Screenshots to Build Your Storyboard
                </h3>
                <p className="text-xs text-txt-muted leading-relaxed max-w-md mx-auto">
                  Drag and drop phone screenshots, tap to browse your gallery, or snap live from your screen. Organize into primary steps & sub-screens, add actions, and download your grid.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 rounded-pill bg-neon hover:bg-neon-bright text-dark-chassis text-xs font-bold transition flex items-center gap-2 shadow-card cursor-pointer active:scale-95"
                >
                  <Upload className="w-4 h-4 stroke-[2.5]" />
                  <span>Select Screenshots</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsLiveCaptureOpen(true)}
                  className="px-4 py-2.5 rounded-pill bg-dark-secondary hover:bg-dark-tertiary text-white text-xs font-semibold flex items-center gap-2 border border-dark-tertiary transition cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-neon" />
                  <span>Live Screen Capture</span>
                </button>
              </div>

              <div className="text-[11px] text-txt-muted font-mono pt-4">
                Local-first • No database required • Instant 2x Retina grid export
              </div>
            </div>
          ) : (
            /* Active Storyboard Grid View */
            <div className="space-y-4">
              
              {/* Executive Flow Specifications & AI Context Card */}
              <div className="rounded-2xl bg-dark-secondary/80 border border-dark-tertiary shadow-sm overflow-hidden transition-all">
                {/* Collapsible Header */}
                <button
                  type="button"
                  onClick={() => setIsExecutiveCardOpen(!isExecutiveCardOpen)}
                  className="w-full px-4 py-3 bg-dark-secondary flex items-center justify-between gap-3 text-left transition hover:bg-dark-secondary/90 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-dark-chassis text-neon flex items-center justify-center font-bold text-xs border border-neon/30 shrink-0">
                      <BookOpen className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-bold text-white tracking-tight">Executive Specifications & AI Context Matrix</h4>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                          definedPillarsCount > 0 ? 'bg-neon text-dark-chassis shadow-xs' : 'bg-dark-chassis text-txt-muted border border-dark-tertiary'
                        }`}>
                          {definedPillarsCount} of 8 Pillars Defined
                        </span>
                      </div>
                      <p className="text-[11px] text-txt-muted truncate">
                        Define business rules, failure boundaries, user types, and system hooks printed on your storyboard
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-semibold text-neon hidden sm:inline">
                      {isExecutiveCardOpen ? 'Collapse Specifications' : 'Edit Specifications'}
                    </span>
                    <div className="p-1 rounded-full bg-dark-chassis text-txt-muted">
                      {isExecutiveCardOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                </button>

                {/* Expanded Body: 8 Pillars Grid */}
                {isExecutiveCardOpen && (
                  <div className="p-4 border-t border-dark-tertiary bg-dark-chassis/60 space-y-4 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
                      {[
                        {
                          key: 'featuresAndServices' as const,
                          num: 1,
                          title: 'Features & Services',
                          desc: 'Core service scope, product domain & objectives',
                          placeholder: 'e.g. Peer-to-peer wallet transfers, instant bank settlement, airtime recharge...'
                        },
                        {
                          key: 'userTypes' as const,
                          num: 2,
                          title: 'User Types',
                          desc: 'Personas, KYC tiers & role permissions',
                          placeholder: 'e.g. Tier 1 Unverified, Tier 3 KYC Verified, Merchant Agent, Admin...'
                        },
                        {
                          key: 'journeysAndNavigation' as const,
                          num: 3,
                          title: 'Journeys & Navigation',
                          desc: 'Entry points, back button logic & modal branches',
                          placeholder: 'e.g. Initiated from Dashboard Quick Pay; back button resets recipient picker...'
                        },
                        {
                          key: 'interactionReference' as const,
                          num: 4,
                          title: 'Interaction & Configuration Reference',
                          desc: 'Input formatting, auto-focus, keyboard masks & timeouts',
                          placeholder: 'e.g. MSISDN masked +233, numeric keypad, PIN obscured with biometric prompt...'
                        },
                        {
                          key: 'businessRules' as const,
                          num: 5,
                          title: 'Business Rules & Constraints',
                          desc: 'Min/max limits, fee calculations & validation ceilings',
                          placeholder: 'e.g. Minimum GHS 1.00, maximum GHS 5,000/day, 1% e-levy fee applied on transfer...'
                        },
                        {
                          key: 'systemFailureStates' as const,
                          num: 6,
                          title: 'System & Failure States',
                          desc: 'Lockout thresholds, network retries & error handling',
                          placeholder: 'e.g. 3 invalid PIN attempts lock account 15 mins, 504 gateway triggers retry prompt...'
                        },
                        {
                          key: 'communicationsDependencies' as const,
                          num: 7,
                          title: 'Communications & Dependencies',
                          desc: 'SMS alerts, push notifications & telecom hooks',
                          placeholder: 'e.g. SMS delivery receipt dispatched within 30s, push notification to recipient...'
                        },
                        {
                          key: 'historicalKnowledgeRisk' as const,
                          num: 8,
                          title: 'Historical Knowledge & Risk',
                          desc: 'Regression hotspots, brittle areas & compliance points',
                          placeholder: 'e.g. Known race condition on double-tap submit; BoG regulatory audit logging...'
                        }
                      ].map(pillar => (
                        <div key={pillar.key} className="p-3 rounded-xl bg-dark-secondary/70 border border-dark-tertiary space-y-1.5 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="text-[10px] font-mono font-bold text-neon uppercase tracking-wider">
                                #{pillar.num} {pillar.title}
                              </span>
                              {executiveContext[pillar.key]?.trim() && (
                                <span className="w-1.5 h-1.5 rounded-full bg-neon animate-pulse" />
                              )}
                            </div>
                            <p className="text-[10px] text-txt-muted leading-tight mb-2">
                              {pillar.desc}
                            </p>
                          </div>
                          <textarea
                            rows={3}
                            value={executiveContext[pillar.key] || ''}
                            onChange={(e) => handleUpdateContext(pillar.key, e.target.value)}
                            placeholder={pillar.placeholder}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-dark-chassis border border-dark-tertiary text-xs text-white placeholder:text-txt-muted/50 focus:border-neon focus:outline-none transition resize-none font-sans"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-dark-tertiary/70 text-xs">
                      <span className="text-[11px] text-txt-muted">
                        Specifications automatically save locally and print on exported Storyboard PNGs.
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Clear all 8 executive specifications?')) {
                            const cleared: StoryboardExecutiveContext = {
                              featuresAndServices: '',
                              userTypes: '',
                              journeysAndNavigation: '',
                              interactionReference: '',
                              businessRules: '',
                              systemFailureStates: '',
                              communicationsDependencies: '',
                              historicalKnowledgeRisk: ''
                            };
                            setExecutiveContext(cleared);
                            try {
                              localStorage.removeItem('qa_storyboard_context');
                            } catch (e) {}
                          }
                        }}
                        className="text-xs text-rose-400 hover:text-rose-300 transition cursor-pointer"
                      >
                        Clear Specifications
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Grid Control Bar */}
              <div className="flex items-center justify-between gap-2 text-xs text-txt-muted pb-1 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-2 font-mono flex-wrap">
                  <span>Showing {computedScreens.length} screens in sequence</span>
                  <span>•</span>
                  <span className="text-neon">{computedScreens.filter(s => (s.nestLevel ?? (s.isSubScreen ? 1 : 0)) === 1).length} sub-screens</span>
                  {computedScreens.some(s => s.nestLevel === 2) && (
                    <>
                      <span>•</span>
                      <span className="text-sky-400">{computedScreens.filter(s => s.nestLevel === 2).length} sub-of-subs</span>
                    </>
                  )}
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-dark-secondary/80 border border-dark-tertiary/70 text-[11px] text-txt-muted font-sans font-medium">
                    <GripVertical className="w-3 h-3 text-txt-muted shrink-0" />
                    <span>Drag cards to rearrange</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-neon hover:text-neon-bright transition flex items-center gap-1 font-semibold cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add More Screens</span>
                </button>
              </div>

              {/* 5-Column Responsive Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
                {computedScreens.map((screen, idx) => {
                  const isDragging = draggedIndex === idx;
                  const isDragOver = dragOverIndex === idx && draggedIndex !== idx;
                  const nestLevel = screen.nestLevel ?? (screen.isSubScreen ? 1 : 0);

                  return (
                    <div
                      key={screen.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragLeave={(e) => handleDragLeave(e, idx)}
                      onDrop={(e) => handleDrop(e, idx)}
                      onDragEnd={handleDragEnd}
                      className={`rounded-2xl transition-all flex flex-col overflow-hidden shadow-sm group select-none relative isolate cursor-grab active:cursor-grabbing ${
                        isDragging
                          ? 'opacity-25 scale-95 border-2 border-dashed border-neon ring-4 ring-neon/20'
                          : isDragOver
                          ? 'ring-2 ring-neon border-neon bg-dark-secondary/95 scale-[1.02] shadow-lg shadow-neon/15 z-20'
                          : nestLevel === 2
                          ? 'border border-sky-400/50 bg-dark-secondary/85 shadow-sm shadow-sky-400/5'
                          : nestLevel === 1
                          ? 'border border-neon/40 bg-dark-secondary/80 shadow-sm shadow-neon/5'
                          : 'border border-dark-tertiary bg-dark-secondary hover:border-dark-tertiary/90'
                      }`}
                    >
                      {/* Top Device Preview Box */}
                      <div className="relative aspect-[9/16] bg-black overflow-hidden flex items-center justify-center">
                        
                        {/* Step Number Badge */}
                        <div className={`absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full font-mono font-bold text-[10px] flex items-center gap-1 shadow-sm ${
                          nestLevel === 2
                            ? 'bg-sky-400 text-dark-chassis border border-sky-300 shadow-sky-400/30'
                            : nestLevel === 1
                            ? 'bg-neon text-dark-chassis border border-neon/50 shadow-neon/30'
                            : 'bg-dark-chassis/95 text-white border border-dark-tertiary'
                        }`}>
                          {nestLevel > 0 && <CornerDownRight className="w-2.5 h-2.5 stroke-[2.5]" />}
                          <span>{screen.stepBadge}</span>
                        </div>

                        {/* Top-Right Control Buttons: Delete & Drag Handle */}
                        <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              handleDeleteScreen(screen.id);
                            }}
                            className="p-1 rounded-md bg-dark-chassis/90 hover:bg-rose-600 text-txt-muted hover:text-white border border-dark-tertiary/70 hover:border-rose-500 transition shadow-sm cursor-pointer opacity-80 group-hover:opacity-100"
                            title="Delete this screen"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                          <div 
                            className="p-1 rounded-md bg-dark-chassis/80 text-txt-muted group-hover:text-white border border-dark-tertiary/60 opacity-60 group-hover:opacity-100 transition shadow-sm cursor-grab active:cursor-grabbing"
                            title="Drag to rearrange"
                          >
                            <GripVertical className="w-3 h-3" />
                          </div>
                        </div>

                        {/* Screen Thumbnail */}
                        <img
                          src={screen.previewUrl}
                          alt={screen.name}
                          onClick={() => setPreviewScreen(screen)}
                          className="w-full h-full object-contain cursor-pointer transition group-hover:scale-105"
                        />

                        {/* Quick Hover Controls Overlay */}
                        <div className="absolute inset-0 bg-dark-chassis/70 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 pointer-events-none">
                          <div className="flex items-center justify-between pointer-events-auto">
                            <button
                              type="button"
                              onClick={() => setPreviewScreen(screen)}
                              className="p-1 rounded-full bg-dark-secondary text-txt-muted hover:text-white cursor-pointer"
                              title="Preview Fullscreen"
                            >
                              <Eye className="w-3 h-3" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleDeleteScreen(screen.id);
                              }}
                              className="p-1 rounded-full bg-dark-secondary text-txt-muted hover:text-rose-400 hover:bg-rose-500/20 cursor-pointer"
                              title="Remove Screen"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Middle Action: Reorder Button Nudge */}
                          <div className="flex items-center justify-center gap-2 pointer-events-auto">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveScreen(idx, 'left');
                              }}
                              disabled={idx === 0}
                              className="p-1 rounded-full bg-dark-secondary text-txt-muted hover:text-white disabled:opacity-20 cursor-pointer"
                              title="Move Left"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveScreen(idx, 'right');
                              }}
                              disabled={idx === computedScreens.length - 1}
                              className="p-1 rounded-full bg-dark-secondary text-txt-muted hover:text-white disabled:opacity-20 cursor-pointer"
                              title="Move Right"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Bottom Action: Edit Details */}
                          <div className="pointer-events-auto">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedScreenForEdit(screen);
                              }}
                              className="w-full py-1 rounded-xl bg-neon hover:bg-neon-bright text-dark-chassis font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit Actions</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Card Content Footer */}
                      <div className="p-2.5 space-y-2 flex-1 flex flex-col justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="font-bold text-xs text-white truncate" title={screen.name || `Screen ${idx + 1}`}>
                              {screen.name || `Screen ${idx + 1}`}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleDeleteScreen(screen.id);
                              }}
                              className="p-1 rounded-md hover:bg-rose-500/20 text-txt-muted hover:text-rose-400 transition cursor-pointer shrink-0"
                              title="Delete this screen"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Action Steps Count Snippet */}
                          {screen.actions && screen.actions.length > 0 ? (
                            <div className="text-[10px] text-neon flex items-center gap-1 flex-wrap">
                              <Layers className="w-2.5 h-2.5 shrink-0" />
                              <span>
                                {screen.actions.filter(a => !a.role || a.role === 'sequential').length > 0
                                  ? `${screen.actions.filter(a => !a.role || a.role === 'sequential').length} step${screen.actions.filter(a => !a.role || a.role === 'sequential').length === 1 ? '' : 's'}`
                                  : `${screen.actions.length} action${screen.actions.length === 1 ? '' : 's'}`}
                              </span>
                              {screen.actions.some(a => a.role === 'optional') && (
                                <span className="text-amber-300">
                                  • {screen.actions.filter(a => a.role === 'optional').length} opt
                                </span>
                              )}
                              {screen.actions.some(a => a.role === 'exit' || a.role === 'link') && (
                                <span className="text-rose-300">
                                  • {screen.actions.filter(a => a.role === 'exit' || a.role === 'link').length} exit
                                </span>
                              )}
                              {new Set(screen.actions.map(a => a.section?.trim()).filter(Boolean)).size > 0 && (
                                <span className="text-sky-300">
                                  • {new Set(screen.actions.map(a => a.section?.trim()).filter(Boolean)).size} sec
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-txt-muted block">No actions added</span>
                          )}
                        </div>

                        {/* 3-Tier Hierarchy Selector or Fixed Entry Tag */}
                        {idx === 0 ? (
                          <div className="w-full py-1 px-2 rounded-lg text-[10px] font-mono text-txt-muted bg-dark-chassis/60 border border-dark-tertiary/40 flex items-center justify-center gap-1">
                            <span>Flow Entry (#1)</span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-dark-chassis border border-dark-tertiary">
                            <button
                              type="button"
                              onClick={() => handleSetNestLevel(idx, 0)}
                              className={`py-1 rounded text-[9px] font-mono font-bold transition cursor-pointer flex items-center justify-center ${
                                nestLevel === 0 
                                  ? 'bg-dark-secondary text-white border border-dark-tertiary shadow-sm' 
                                  : 'text-txt-muted hover:text-white'
                              }`}
                              title="Primary Step (#1, #2)"
                            >
                              Primary
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetNestLevel(idx, 1)}
                              className={`py-1 rounded text-[9px] font-mono font-bold transition cursor-pointer flex items-center justify-center ${
                                nestLevel === 1 
                                  ? 'bg-neon text-dark-chassis font-bold shadow-sm shadow-neon/20' 
                                  : 'text-txt-muted hover:text-white'
                              }`}
                              title="Sub-Screen (#1a, #1b)"
                            >
                              Sub
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetNestLevel(idx, 2)}
                              className={`py-1 rounded text-[9px] font-mono font-bold transition cursor-pointer flex items-center justify-center ${
                                nestLevel === 2 
                                  ? 'bg-sky-400 text-dark-chassis font-bold shadow-sm shadow-sky-400/20' 
                                  : 'text-txt-muted hover:text-white'
                              }`}
                              title="Sub of Sub (#1a.1, #1a.2)"
                            >
                              Sub-Sub
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => {
            if (e.target.files) handleAddFiles(e.target.files);
            e.target.value = '';
          }}
          accept="image/*"
          multiple
          className="hidden"
        />

        {/* Action Editor Side Drawer */}
        <ScreenActionEditorDrawer
          isOpen={!!selectedScreenForEdit}
          screen={selectedScreenForEdit}
          onClose={() => setSelectedScreenForEdit(null)}
          onSave={(updated) => {
            setScreens(prev => prev.map(s => s.id === updated.id ? updated : s));
          }}
          onDelete={(screenId) => {
            handleDeleteScreen(screenId);
            setSelectedScreenForEdit(null);
          }}
        />

        {/* Lightbox Preview Modal */}
        {previewScreen && (
          <div 
            onClick={() => setPreviewScreen(null)}
            className="fixed inset-0 z-70 bg-black/90 flex items-center justify-center p-4 animate-in fade-in cursor-pointer"
          >
            <div className="max-w-4xl max-h-[85vh] relative" onClick={(e) => e.stopPropagation()}>
              <img
                src={previewScreen.previewUrl}
                alt="Enlarged preview"
                className="max-w-full max-h-[85vh] object-contain rounded-2xl border border-dark-secondary shadow-2xl"
              />
              <button
                type="button"
                onClick={() => setPreviewScreen(null)}
                className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-dark-chassis text-white hover:text-neon border border-dark-tertiary flex items-center justify-center cursor-pointer shadow-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Save to Permanent Feature Modal */}
        {isSaveModalOpen && (
          <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-dark-chassis border border-dark-secondary rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-dark-secondary pb-3">
                <div className="flex items-center gap-2">
                  <Save className="w-5 h-5 text-neon" />
                  <h3 className="font-bold text-sm text-white">Save as Permanent Feature Flow</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  disabled={isSavingToDb}
                  className="p-1 rounded-full hover:bg-dark-secondary text-txt-muted hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-txt-muted block mb-1 font-semibold">Target Product Workspace</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    disabled={isSavingToDb}
                    className="w-full px-3 py-2 rounded-xl bg-dark-secondary border border-dark-tertiary text-white focus:outline-none focus:border-neon"
                  >
                    <option value="new">+ Create New Product Workspace</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.platform || 'App'})</option>
                    ))}
                  </select>
                </div>

                {selectedProjectId === 'new' && (
                  <div>
                    <label className="text-txt-muted block mb-1 font-semibold">Product Name</label>
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="e.g. MTN Mobile Money"
                      disabled={isSavingToDb}
                      className="w-full px-3 py-2 rounded-xl bg-dark-secondary border border-dark-tertiary text-white focus:outline-none focus:border-neon"
                    />
                  </div>
                )}

                <div>
                  <label className="text-txt-muted block mb-1 font-semibold">Feature Name</label>
                  <input
                    type="text"
                    value={saveFeatureName}
                    onChange={(e) => setSaveFeatureName(e.target.value)}
                    placeholder="e.g. Peer to Peer Transfer Flow"
                    disabled={isSavingToDb}
                    className="w-full px-3 py-2 rounded-xl bg-dark-secondary border border-dark-tertiary text-white focus:outline-none focus:border-neon"
                  />
                </div>

                {saveStatusText && (
                  <div className="p-2.5 rounded-xl bg-neon/10 border border-neon/30 text-neon text-[11px] flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                    <span>{saveStatusText}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-dark-secondary">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  disabled={isSavingToDb}
                  className="px-4 py-2 rounded-pill bg-dark-secondary hover:bg-dark-tertiary text-txt-secondary text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveToPermanentFeature}
                  disabled={isSavingToDb}
                  className="px-5 py-2 rounded-pill bg-neon hover:bg-neon-bright text-dark-chassis text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingToDb ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  )}
                  <span>Save & Build Journey</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Live Screen Capture Modal */}
        <LiveScreenCaptureModal
          isOpen={isLiveCaptureOpen}
          onClose={() => setIsLiveCaptureOpen(false)}
          onScreensCaptured={handleLiveCaptureScreens}
          title={`Live Capture — ${flowTitle}`}
          description="Capture sequential screens directly into your storyboard."
        />

        {/* ChatGPT Senior QA Prompt Pack Modal */}
        <ChatGPTExportModal
          isOpen={isChatGptModalOpen}
          onClose={() => setIsChatGptModalOpen(false)}
          flowTitle={flowTitle}
          screens={computedScreens}
          executiveContext={executiveContext}
        />

      </div>
    </div>
  );
}
