'use client';

import React, { useState, useRef } from 'react';
import { 
  ScreenItem, 
  ScreenStateType, 
  AIScreenAnalysis,
  StoryboardExecutiveContext,
  StoryboardScreen,
  Feature,
  KnowledgeItem,
  KnowledgeCategory,
  ScreenAction,
  ScreenActionRole
} from '@/lib/types';
import { getStoredGeminiApiKey } from '@/lib/settings';
import { 
  BrainCircuit, 
  Shield, 
  Trash2, 
  Copy, 
  MoveUp, 
  MoveDown, 
  Eye, 
  Edit3, 
  Plus, 
  Upload, 
  Check, 
  X, 
  ChevronDown, 
  ChevronUp,
  Maximize2,
  Layers,
  Camera,
  RefreshCw,
  Download,
  BookOpen,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { LiveScreenCaptureModal } from '@/components/capture/LiveScreenCaptureModal';
import { SnappedScreen } from '@/lib/capture/useScreenCapture';
import { exportStoryboardInSetsOf10, exportStoryboardMasterImage, computeStepBadges } from '@/lib/storyboard/storyboardGridExporter';
import { ScreenActionEditorDrawer } from '@/components/storyboard/ScreenActionEditorDrawer';
import { parseUserActionStringToActions, serializeActionsToUserActionString } from '@/lib/storyboard/actionSerializer';

interface ScreenDeckViewProps {
  screens: ScreenItem[];
  featureId: string;
  feature?: Feature;
  knowledgeItems?: KnowledgeItem[];
  onRefresh: () => void;
  onAnalyzeScreen: (screen: ScreenItem) => void;
}

export function ScreenDeckView({ screens, featureId, feature, knowledgeItems, onRefresh, onAnalyzeScreen }: ScreenDeckViewProps) {
  const [selectedScreen, setSelectedScreen] = useState<ScreenItem | null>(screens[0] || null);
  const [expandedInfoId, setExpandedInfoId] = useState<string | null>(screens[0]?.id || null);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [nameVal, setNameVal] = useState('');
  const [isAutoNaming, setIsAutoNaming] = useState(false);

  // Redaction Modal State
  const [redactingScreen, setRedactingScreen] = useState<ScreenItem | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Live Screen Capture State
  const [isLiveCaptureOpen, setIsLiveCaptureOpen] = useState(false);
  const [isUploadingCaptures, setIsUploadingCaptures] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const handleCaptureScreens = async (snapped: SnappedScreen[]) => {
    if (snapped.length === 0) return;
    setIsUploadingCaptures(true);
    setUploadStatus(`Uploading ${snapped.length} live captures to Supabase...`);

    try {
      const startingIndex = screens.length;
      for (let i = 0; i < snapped.length; i++) {
        const item = snapped[i];
        const screenNumber = startingIndex + i + 1;
        const filePath = `${featureId}/screen-${screenNumber}-${Date.now()}.png`;

        let finalImageUrl = item.previewUrl;
        let storagePath: string | null = null;

        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('qa_screenshots')
          .upload(filePath, item.file, {
            cacheControl: '3600',
            upsert: true
          });

        if (!uploadErr && uploadData) {
          storagePath = uploadData.path;
          const { data: publicUrlData } = supabase.storage
            .from('qa_screenshots')
            .getPublicUrl(uploadData.path);
          if (publicUrlData?.publicUrl) {
            finalImageUrl = publicUrlData.publicUrl;
          }
        }

        await supabase.from('qa_screens').insert({
          feature_id: featureId,
          screen_number: screenNumber,
          name: item.name || `Screen ${screenNumber}`,
          image_url: finalImageUrl,
          storage_path: storagePath,
          user_action: `User action on Step ${screenNumber}`,
          expected_behavior: 'System processes input and transitions to next state',
          state: 'normal'
        });
      }

      // Automatically trigger AI auto-naming for the screens
      setUploadStatus('AI Vision analyzing new screenshots & generating titles...');
      const apiKey = getStoredGeminiApiKey();
      await fetch('/api/screens/auto-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature_id: featureId, api_key: apiKey, force_all: true })
      });

      // Automatically reconstruct the Visual User Journey DAG!
      setUploadStatus('Rebuilding Visual User Journey DAG...');
      await fetch('/api/journey/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature_id: featureId })
      });

      onRefresh();
    } catch (err: any) {
      console.error('Failed to save captured screens:', err);
      alert('Failed to save some screens. Check console.');
    } finally {
      setIsUploadingCaptures(false);
      setUploadStatus(null);
      setIsLiveCaptureOpen(false);
    }
  };

  const handleAutoNameAll = async () => {
    setIsAutoNaming(true);
    try {
      const apiKey = getStoredGeminiApiKey();

      const res = await fetch('/api/screens/auto-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature_id: featureId, api_key: apiKey, force_all: true })
      });

      if (!res.ok) throw new Error('Auto-naming failed');
      onRefresh();
    } catch (err) {
      console.error('Error auto-naming screens:', err);
      alert('Error auto-naming screens. Check console for details.');
    } finally {
      setIsAutoNaming(false);
    }
  };

  // Action Editor Side Drawer State
  const [selectedScreenForActionEdit, setSelectedScreenForActionEdit] = useState<StoryboardScreen | null>(null);

  // 8-Pillars Executive Blueprint Modal State
  const [isBlueprintModalOpen, setIsBlueprintModalOpen] = useState(false);
  const [blueprintContext, setBlueprintContext] = useState<StoryboardExecutiveContext>({});
  const [isSavingBlueprint, setIsSavingBlueprint] = useState(false);

  // Storyboard Export State
  const [isExportingStoryboard, setIsExportingStoryboard] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [includeActionsInExport, setIncludeActionsInExport] = useState(true);
  const [includeContextInExport, setIncludeContextInExport] = useState(true);

  const PILLAR_CONFIG: Array<{ key: keyof StoryboardExecutiveContext; category: KnowledgeCategory; label: string; placeholder: string }> = [
    { key: 'featuresAndServices', category: 'Features & Services', label: '1. Features & Services', placeholder: 'Core user-facing capabilities, checkout steps, payment options...' },
    { key: 'userTypes', category: 'User Types', label: '2. User Types & Roles', placeholder: 'Target customer personas, guest users, authenticated members...' },
    { key: 'journeysAndNavigation', category: 'Journeys & Navigation', label: '3. Journeys & Navigation', placeholder: 'Entry routes, deep-link triggers, return paths...' },
    { key: 'interactionReference', category: 'Interaction & Configuration Reference', label: '4. Interaction & Configuration', placeholder: 'Input controls, touch gestures, carousel swipe, sheet modals...' },
    { key: 'businessRules', category: 'Business Rules & Constraints', label: '5. Business Rules & Constraints', placeholder: 'Threshold limits, mandatory validation, coupon rules...' },
    { key: 'systemFailureStates', category: 'System & Failure States', label: '6. System & Failure States', placeholder: 'Offline behavior, connectivity timeout, stockout alerts...' },
    { key: 'communicationsDependencies', category: 'Communications & Dependencies', label: '7. Communications & Dependencies', placeholder: 'Push notifications, SMS OTP, payment gateway webhooks...' },
    { key: 'historicalKnowledgeRisk', category: 'Historical Knowledge & Risk', label: '8. Historical Knowledge & Risk', placeholder: 'Known regression points, edge cases, legacy device issues...' }
  ];

  const openActionEditorForScreen = (scr: ScreenItem) => {
    const parsedActions = scr.actions && scr.actions.length > 0
      ? scr.actions
      : parseUserActionStringToActions(scr.user_action);

    const nestLevel = scr.nest_level ?? (scr.notes?.includes('Level 2') ? 2 : (scr.notes?.includes('Sub-step') || scr.is_sub_screen ? 1 : 0));

    setSelectedScreenForActionEdit({
      id: scr.id,
      previewUrl: scr.image_url,
      name: scr.name,
      isSubScreen: nestLevel > 0,
      nestLevel,
      stepBadge: `#${scr.screen_number}`,
      actions: parsedActions,
      expectedResult: scr.expected_behavior || ''
    });
  };

  const handleSaveScreenActions = async (updated: StoryboardScreen) => {
    try {
      const serializedUserAction = serializeActionsToUserActionString(updated.actions);
      const updatedNotes = updated.nestLevel === 2
        ? `Sub-step Level 2 (${updated.stepBadge})`
        : updated.nestLevel === 1
        ? `Sub-step (${updated.stepBadge})`
        : null;

      const { error } = await supabase
        .from('qa_screens')
        .update({
          name: updated.name,
          user_action: serializedUserAction,
          expected_behavior: updated.expectedResult || null,
          notes: updatedNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', updated.id);

      if (error) throw error;
      setSelectedScreenForActionEdit(null);
      onRefresh();
    } catch (err: any) {
      console.error('Failed to save screen actions:', err);
      alert('Failed to save screen actions. Check console.');
    }
  };

  const openBlueprintModal = async () => {
    const compiled: StoryboardExecutiveContext = {};
    try {
      let kData = knowledgeItems;
      if (!kData || kData.length === 0) {
        const { data } = await supabase
          .from('qa_knowledge_items')
          .select('*')
          .eq('feature_id', featureId);
        kData = data || [];
      }

      if (kData && kData.length > 0) {
        const catMap: Record<string, string[]> = {};
        kData.forEach((k: any) => {
          if (!catMap[k.category]) catMap[k.category] = [];
          const line = k.title && k.content && k.title !== k.category ? `${k.title}: ${k.content}` : (k.content || k.title);
          if (line) catMap[k.category].push(line);
        });

        PILLAR_CONFIG.forEach(cfg => {
          if (catMap[cfg.category]?.length) {
            compiled[cfg.key] = catMap[cfg.category].join('\n');
          }
        });
      } else if (feature) {
        if (feature.description) compiled.featuresAndServices = feature.description;
        if (feature.purpose) compiled.journeysAndNavigation = feature.purpose;
      }
    } catch (e) {
      console.warn('Error loading blueprint context:', e);
    }
    setBlueprintContext(compiled);
    setIsBlueprintModalOpen(true);
  };

  const handleSaveBlueprint = async () => {
    setIsSavingBlueprint(true);
    try {
      for (const cfg of PILLAR_CONFIG) {
        const content = blueprintContext[cfg.key]?.trim();
        if (content) {
          const { data: existing } = await supabase
            .from('qa_knowledge_items')
            .select('id')
            .eq('feature_id', featureId)
            .eq('category', cfg.category)
            .limit(1);

          if (existing && existing.length > 0) {
            await supabase
              .from('qa_knowledge_items')
              .update({
                content,
                verification_status: 'Verified',
                updated_at: new Date().toISOString()
              })
              .eq('id', existing[0].id);
          } else {
            await supabase
              .from('qa_knowledge_items')
              .insert({
                feature_id: featureId,
                category: cfg.category,
                title: cfg.label.replace(/^\d+\.\s*/, ''),
                content,
                source: 'User',
                confidence: 'CONFIRMED',
                verification_status: 'Verified'
              });
          }
        }
      }
      setIsBlueprintModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Failed to save blueprint specifications:', err);
      alert('Failed to save blueprint specifications. Check console.');
    } finally {
      setIsSavingBlueprint(false);
    }
  };

  const handleExportStoryboard = async (mode: 'sets_of_10' | 'master' = 'master') => {
    if (screens.length === 0) return;
    setIsExportingStoryboard(true);
    setIsExportMenuOpen(false);
    try {
      const storyboardScreens: StoryboardScreen[] = screens.map((s) => {
        const parsedActions = s.actions && s.actions.length > 0
          ? s.actions
          : parseUserActionStringToActions(s.user_action);

        const nestLevel = s.nest_level ?? (s.notes?.includes('Level 2') ? 2 : (s.notes?.includes('Sub-step') || s.is_sub_screen ? 1 : 0));

        return {
          id: s.id,
          previewUrl: s.image_url,
          name: s.name || `Screen ${s.screen_number}`,
          isSubScreen: nestLevel > 0,
          nestLevel,
          stepBadge: `#${s.screen_number}`,
          actions: parsedActions,
          expectedResult: s.expected_behavior || ''
        };
      });

      // Compute hierarchical badges (#1, #1a, #1a.1...)
      const computedStoryboardScreens = computeStepBadges(storyboardScreens);

      // Fetch and aggregate knowledge items for this feature to provide executive context
      const execContext: StoryboardExecutiveContext = {};
      try {
        let kData = knowledgeItems;
        if (!kData || kData.length === 0) {
          const { data } = await supabase
            .from('qa_knowledge_items')
            .select('*')
            .eq('feature_id', featureId);
          kData = data || [];
        }

        if (kData && kData.length > 0) {
          const catMap: Record<string, string[]> = {};
          kData.forEach((k: any) => {
            if (!catMap[k.category]) catMap[k.category] = [];
            const line = k.title && k.content && k.title !== k.category ? `${k.title}: ${k.content}` : (k.content || k.title);
            if (line) catMap[k.category].push(line);
          });

          PILLAR_CONFIG.forEach(cfg => {
            if (catMap[cfg.category]?.length) {
              execContext[cfg.key] = catMap[cfg.category].join('\n');
            }
          });
        } else if (feature) {
          if (feature.description) execContext.featuresAndServices = feature.description;
          if (feature.purpose) execContext.journeysAndNavigation = feature.purpose;
        }
      } catch (e) {
        console.warn('Error extracting knowledge for export:', e);
      }

      const flowTitle = feature?.name ? `${feature.name} Storyboard Flow` : 'Screen Journey Deck Flow';

      if (mode === 'sets_of_10') {
        await exportStoryboardInSetsOf10(computedStoryboardScreens, {
          title: flowTitle,
          includeActions: includeActionsInExport,
          theme: 'light',
          context: execContext,
          includeContext: includeContextInExport
        });
      } else {
        await exportStoryboardMasterImage(computedStoryboardScreens, {
          title: flowTitle,
          includeActions: includeActionsInExport,
          theme: 'light',
          context: execContext,
          includeContext: includeContextInExport
        });
      }
    } catch (err) {
      console.error('Failed to export storyboard:', err);
      alert('Failed to generate storyboard image. Check console for details.');
    } finally {
      setIsExportingStoryboard(false);
    }
  };

  const stateColors: Record<ScreenStateType, string> = {
    normal: 'bg-clinical-border text-dark-chassis',
    loading: 'bg-neon text-dark-chassis',
    empty: 'bg-clinical-muted text-txt-secondary',
    success: 'bg-status-positive/20 text-dark-chassis border border-status-positive',
    error: 'bg-status-critical/20 text-status-critical border border-status-critical',
    warning: 'bg-neon/30 text-dark-chassis border border-neon',
    validation: 'bg-status-warning/20 text-dark-chassis border border-status-warning',
    authentication: 'bg-dark-chassis text-neon border border-neon/50',
    permission: 'bg-dark-tertiary text-white',
    confirmation: 'bg-clinical-warm text-dark-chassis border border-dark-chassis',
    exceptional: 'bg-status-critical text-white'
  };

  const handleUpdateScreen = async (screenId: string, updates: Partial<ScreenItem>) => {
    try {
      const { error } = await supabase
        .from('qa_screens')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', screenId);
      if (error) throw error;
      onRefresh();
    } catch (err: any) {
      console.error('Update error:', err);
    }
  };

  const moveScreen = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === screens.length - 1) return;

    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const current = screens[index];
    const target = screens[targetIdx];

    await supabase.from('qa_screens').update({ screen_number: target.screen_number }).eq('id', current.id);
    await supabase.from('qa_screens').update({ screen_number: current.screen_number }).eq('id', target.id);
    onRefresh();
  };

  const deleteScreen = async (screenId: string) => {
    if (!confirm('Are you sure you want to delete this screen?')) return;
    await supabase.from('qa_screens').delete().eq('id', screenId);
    onRefresh();
  };

  const duplicateScreen = async (screen: ScreenItem) => {
    await supabase.from('qa_screens').insert({
      feature_id: featureId,
      screen_number: screen.screen_number + 1,
      name: `${screen.name} (Copy)`,
      image_url: screen.image_url,
      description: screen.description,
      state: screen.state,
      user_action: screen.user_action,
      expected_behavior: screen.expected_behavior,
      ai_analysis: screen.ai_analysis,
      notes: screen.notes
    });
    onRefresh();
  };

  // PII Redaction Canvas Functions
  const startRedactionModal = (screen: ScreenItem) => {
    setRedactingScreen(screen);
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = screen.image_url;
      img.onload = () => {
        canvas.width = img.naturalWidth || 600;
        canvas.height = img.naturalHeight || 900;
        ctx?.drawImage(img, 0, 0);
      };
    }, 100);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    setStartPos({
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    });
    setIsDrawing(true);
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;

    const width = currentX - startPos.x;
    const height = currentY - startPos.y;

    // Draw Blackout Redaction Box
    ctx.fillStyle = '#111210';
    ctx.fillRect(startPos.x, startPos.y, width, height);

    // Add Redaction Label
    ctx.fillStyle = '#F2F52A';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('CONFIDENTIAL [REDACTED]', startPos.x + 8, startPos.y + 20);
  };

  const saveRedaction = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !redactingScreen) return;
    const dataUrl = canvas.toDataURL('image/png');
    await handleUpdateScreen(redactingScreen.id, {
      image_url: dataUrl,
      pii_flagged: true
    });
    setRedactingScreen(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-4 sm:p-6 space-y-6">
      
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-clinical-white p-3.5 rounded-2xl border border-clinical-border shadow-subtle">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-neon" />
          <span className="text-xs font-semibold text-dark-chassis tracking-tight">
            SCREEN JOURNEY DECK <span className="text-txt-muted font-normal">({screens.length} screens sequenced)</span>
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            type="button"
            onClick={openBlueprintModal}
            className="px-3.5 py-1.5 rounded-pill bg-clinical-warm hover:bg-clinical-border text-dark-chassis text-xs font-semibold flex items-center gap-1.5 transition shadow-xs active:scale-95 cursor-pointer border border-clinical-border"
            title="View and edit the 8 Core Product & QA Blueprint Pillars for this feature"
          >
            <BookOpen className="w-3.5 h-3.5 text-neon" />
            <span>Edit 8 Blueprint Pillars</span>
          </button>

          <button
            type="button"
            onClick={() => setIsLiveCaptureOpen(true)}
            disabled={isUploadingCaptures}
            className="px-3.5 py-1.5 rounded-pill bg-dark-chassis hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
            title="Stream and capture live screens from iOS Simulator, Android Studio AVD, or Web App"
          >
            <Camera className="w-3.5 h-3.5 text-neon" />
            <span>Live Screen Capture</span>
          </button>

          <button
            onClick={handleAutoNameAll}
            disabled={isAutoNaming || screens.length === 0 || isUploadingCaptures}
            className="px-3.5 py-1.5 rounded-pill bg-neon hover:bg-neon-bright text-dark-chassis text-xs font-bold flex items-center gap-1.5 transition shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Automatically analyze and rename all screens with clean semantic AI titles"
          >
            <BrainCircuit className={`w-3.5 h-3.5 ${isAutoNaming ? 'animate-spin' : ''}`} />
            {isAutoNaming ? 'Naming Screens...' : 'Auto-Name All'}
          </button>

          {/* Download Storyboard Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              disabled={isExportingStoryboard || screens.length === 0}
              className="px-3.5 py-1.5 rounded-pill bg-dark-chassis hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Download full screen sequence as a high-res Storyboard Grid image"
            >
              {isExportingStoryboard ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 text-neon" />
              )}
              <span>Download Storyboard</span>
              <ChevronDown className="w-3 h-3 text-txt-muted" />
            </button>

            {/* Floating Options Dropdown */}
            {isExportMenuOpen && (
              <div 
                className="absolute right-0 top-full mt-2 w-72 bg-dark-chassis border border-dark-secondary rounded-2xl p-2.5 shadow-2xl z-40 space-y-2 animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-2 py-1 border-b border-dark-secondary/80">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-txt-muted block">
                    Export Grid Format (2x Retina)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleExportStoryboard('sets_of_10')}
                  className="w-full text-left p-2 rounded-xl bg-dark-secondary hover:bg-neon/10 border border-dark-tertiary hover:border-neon/40 transition group cursor-pointer"
                >
                  <div className="text-xs font-bold text-white group-hover:text-neon flex items-center justify-between">
                    <span>Download in Sets of 10</span>
                    <span className="text-[10px] font-mono text-neon">2 × 5 Grid</span>
                  </div>
                  <p className="text-[10px] text-txt-muted mt-0.5 leading-tight">
                    Chunks flow into 10-screen sets with staggered browser downloads
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleExportStoryboard('master')}
                  className="w-full text-left p-2 rounded-xl bg-dark-secondary hover:bg-neon/10 border border-dark-tertiary hover:border-neon/40 transition group cursor-pointer"
                >
                  <div className="text-xs font-bold text-white group-hover:text-neon flex items-center justify-between">
                    <span>Download 1 Master Image</span>
                    <span className="text-[10px] font-mono text-txt-muted">All {screens.length}</span>
                  </div>
                  <p className="text-[10px] text-txt-muted mt-0.5 leading-tight">
                    Continuous multi-row composite image of full flow (1 file)
                  </p>
                </button>

                <div className="pt-2 border-t border-dark-secondary flex flex-col gap-1.5 px-1">
                  <label className="text-[11px] text-txt-secondary cursor-pointer flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={includeActionsInExport}
                      onChange={(e) => setIncludeActionsInExport(e.target.checked)}
                      className="rounded accent-neon"
                    />
                    <span>Print User Actions & Roles</span>
                  </label>
                  <label className="text-[11px] text-txt-secondary cursor-pointer flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={includeContextInExport}
                      onChange={(e) => setIncludeContextInExport(e.target.checked)}
                      className="rounded accent-neon"
                    />
                    <span>Print 8-Pillar Executive Matrix</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <span className="text-xs text-txt-muted">Sequence:</span>
            <div className="flex items-center gap-1 overflow-x-auto max-w-xs xl:max-w-md py-0.5 text-[11px] font-mono">
              {screens.map((s, idx) => (
                <React.Fragment key={s.id}>
                  <span className="px-2 py-0.5 rounded bg-clinical-warm text-dark-chassis border border-clinical-border font-semibold">
                    #{s.screen_number}
                  </span>
                  {idx < screens.length - 1 && <span className="text-txt-muted">→</span>}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Uploading Captures Processing Banner */}
      {isUploadingCaptures && (
        <div className="p-3 bg-neon/15 border border-neon/40 rounded-2xl flex items-center gap-3 text-xs text-neon-dark font-medium animate-pulse shadow-sm">
          <RefreshCw className="w-4 h-4 animate-spin text-neon-dark shrink-0" />
          <span>{uploadStatus || 'Processing captured screens and synthesizing Visual Journey...'}</span>
        </div>
      )}

      {/* Main Screen Cards Grid */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {screens.length === 0 ? (
          <div className="bg-clinical-white rounded-2xl border border-clinical-border p-12 text-center max-w-md mx-auto space-y-3 mt-12 shadow-subtle">
            <Layers className="w-8 h-8 text-txt-muted mx-auto opacity-40" />
            <h4 className="text-sm font-bold text-dark-chassis">No Screenshots Uploaded Yet</h4>
            <p className="text-xs text-txt-secondary">
              Upload application screenshots in sequence to map this feature&apos;s UI and build journey intelligence.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {screens.map((scr, idx) => {
              const isExpanded = expandedInfoId === scr.id;
            return (
              <div 
                key={scr.id}
                className={`bg-clinical-white rounded-2xl border transition-all flex flex-col shadow-card hover:shadow-floating ${
                  selectedScreen?.id === scr.id 
                    ? 'border-dark-chassis ring-1 ring-dark-chassis' 
                    : 'border-clinical-border'
                }`}
                onClick={() => setSelectedScreen(scr)}
              >
                {/* Header Card Strip */}
                <div className="p-3 pb-2 flex items-center justify-between border-b border-clinical-border/60">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-dark-chassis text-neon text-[10px] font-mono font-bold">
                      #{scr.screen_number}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${stateColors[scr.state] || stateColors.normal}`}>
                      {scr.state}
                    </span>
                  </div>

                  {/* Move Up/Down Controls */}
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); moveScreen(idx, 'up'); }}
                      disabled={idx === 0}
                      className="p-1 rounded hover:bg-clinical-warm disabled:opacity-20 text-dark-chassis"
                      title="Move Left/Up"
                    >
                      <MoveUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); moveScreen(idx, 'down'); }}
                      disabled={idx === screens.length - 1}
                      className="p-1 rounded hover:bg-clinical-warm disabled:opacity-20 text-dark-chassis"
                      title="Move Right/Down"
                    >
                      <MoveDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Screenshot Image Preview Container */}
                <div className="p-3 pb-1">
                  <div className="aspect-[9/16] bg-clinical-warm rounded-xl overflow-hidden relative border border-clinical-border group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={scr.image_url} 
                      alt={scr.name} 
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />

                    {/* Redacted Badge if PII Masked */}
                    {scr.pii_flagged && (
                      <div className="absolute top-2 right-2 bg-status-critical text-white text-[9px] px-1.5 py-0.5 rounded font-bold shadow">
                        REDACTED
                      </div>
                    )}

                    {/* Overlay Action Pills */}
                    <div className="absolute inset-0 bg-dark-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 gap-1.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); openActionEditorForScreen(scr); }}
                        className="w-full py-1 px-2 rounded-pill bg-neon hover:bg-neon-bright text-dark-chassis text-[10px] font-bold flex items-center justify-center gap-1 shadow cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        Edit Actions & Steps
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); startRedactionModal(scr); }}
                        className="w-full py-1 px-2 rounded-pill bg-clinical-white/95 hover:bg-clinical-white text-dark-chassis text-[10px] font-medium flex items-center justify-center gap-1 shadow cursor-pointer"
                      >
                        <Shield className="w-3 h-3 text-status-critical" />
                        Mask Sensitive Data
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onAnalyzeScreen(scr); }}
                        className="w-full py-1 px-2 rounded-pill bg-clinical-warm hover:bg-clinical-white text-dark-chassis text-[10px] font-semibold flex items-center justify-center gap-1 shadow cursor-pointer"
                      >
                        <BrainCircuit className="w-3 h-3" />
                        AI Analyze Screen
                      </button>
                    </div>
                  </div>
                </div>

                {/* Screen Name & Inline Edit */}
                <div className="px-3 py-1">
                  {editingNameId === scr.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={nameVal}
                        onChange={(e) => setNameVal(e.target.value)}
                        className="flex-1 text-xs px-1.5 py-1 bg-clinical-warm border border-dark-chassis rounded"
                        autoFocus
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateScreen(scr.id, { name: nameVal });
                          setEditingNameId(null);
                        }}
                        className="p-1 text-status-positive"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div 
                      className="flex items-center justify-between cursor-pointer group/title"
                      onClick={() => {
                        setEditingNameId(scr.id);
                        setNameVal(scr.name);
                      }}
                    >
                      <h4 className="text-xs font-semibold text-dark-chassis truncate">
                        {scr.name}
                      </h4>
                      <Edit3 className="w-3 h-3 text-txt-muted opacity-0 group-hover/title:opacity-100 transition" />
                    </div>
                  )}
                </div>

                {/* Structured Actions & Interactions Preview */}
                {(() => {
                  const cardActions = scr.actions && scr.actions.length > 0
                    ? scr.actions
                    : parseUserActionStringToActions(scr.user_action);

                  return (
                    <div className="px-3 py-1.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-dark-chassis tracking-tight">
                          <Layers className="w-3 h-3 text-neon" />
                          <span>ACTIONS</span>
                          {cardActions.length > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full bg-clinical-warm text-dark-chassis font-mono text-[9px] border border-clinical-border font-semibold">
                              {cardActions.filter(a => !a.role || a.role === 'sequential').length > 0
                                ? `${cardActions.filter(a => !a.role || a.role === 'sequential').length} step${cardActions.filter(a => !a.role || a.role === 'sequential').length === 1 ? '' : 's'}`
                                : `${cardActions.length} action${cardActions.length === 1 ? '' : 's'}`}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openActionEditorForScreen(scr);
                          }}
                          className="text-[10px] text-neon hover:text-neon-bright font-bold flex items-center gap-1 px-1.5 py-0.5 rounded-md hover:bg-dark-chassis transition cursor-pointer"
                          title="Open Action Editor Side Drawer"
                        >
                          <Edit3 className="w-2.5 h-2.5" />
                          <span>Edit</span>
                        </button>
                      </div>

                      {cardActions.length === 0 ? (
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            openActionEditorForScreen(scr);
                          }}
                          className="p-2 rounded-lg bg-clinical-warm/60 border border-dashed border-clinical-border text-[10px] text-txt-muted hover:border-dark-chassis hover:text-dark-chassis cursor-pointer transition flex items-center justify-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add interaction steps...</span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {cardActions.slice(0, 3).map((act, actIdx) => (
                            <div 
                              key={act.id || actIdx}
                              className="flex items-start gap-1.5 text-[10px] p-1 rounded-md bg-clinical-warm/60 border border-clinical-border/60"
                            >
                              {/* Role Badge */}
                              {act.role === 'optional' ? (
                                <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shrink-0 uppercase">
                                  OPT
                                </span>
                              ) : act.role === 'exit' ? (
                                <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-rose-100 text-rose-800 border border-rose-300 shrink-0 uppercase">
                                  EXIT ⤶
                                </span>
                              ) : act.role === 'link' ? (
                                <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-sky-100 text-sky-800 border border-sky-300 shrink-0 uppercase">
                                  LINK ↗
                                </span>
                              ) : (
                                <span className="px-1 py-0.2 rounded text-[8px] font-mono font-bold bg-dark-chassis text-neon shrink-0">
                                  #{actIdx + 1}
                                </span>
                              )}

                              {/* Section Tag */}
                              {act.section && (
                                <span className="px-1 py-0.2 rounded text-[8px] font-medium bg-clinical-white text-txt-secondary border border-clinical-border shrink-0 truncate max-w-[80px]">
                                  {act.section}
                                </span>
                              )}

                              {/* Description */}
                              <span className="text-dark-chassis truncate flex-1 font-medium leading-tight">
                                {act.description}
                              </span>
                            </div>
                          ))}

                          {cardActions.length > 3 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openActionEditorForScreen(scr);
                              }}
                              className="text-[9px] font-semibold text-neon hover:underline block text-left pt-0.5 cursor-pointer"
                            >
                              + {cardActions.length - 3} more action{cardActions.length - 3 === 1 ? '' : 's'}...
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Expandable Info Toggle */}
                <div className="p-3 pt-2 mt-auto border-t border-clinical-border/60 flex items-center justify-between text-xs">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedInfoId(isExpanded ? null : scr.id);
                    }}
                    className="text-[11px] text-txt-muted hover:text-dark-chassis flex items-center gap-1 font-medium"
                  >
                    <span>{isExpanded ? 'Collapse' : 'Details & AI'}</span>
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); duplicateScreen(scr); }}
                      className="p-1 rounded hover:bg-clinical-warm text-txt-muted hover:text-dark-chassis"
                      title="Duplicate screen"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteScreen(scr.id); }}
                      className="p-1 rounded hover:bg-status-critical/20 text-txt-muted hover:text-status-critical"
                      title="Delete screen"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Expanded Information Panel */}
                {isExpanded && (() => {
                  const cardActions = scr.actions && scr.actions.length > 0
                    ? scr.actions
                    : parseUserActionStringToActions(scr.user_action);

                  return (
                    <div className="p-3 bg-clinical-warm border-t border-clinical-border text-xs space-y-3 rounded-b-2xl">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[10px] font-bold text-dark-chassis">Interaction Steps & Roles ({cardActions.length})</label>
                          <button
                            type="button"
                            onClick={() => openActionEditorForScreen(scr)}
                            className="text-[10px] font-bold text-neon hover:text-neon-bright flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-2.5 h-2.5" />
                            <span>Manage in Drawer</span>
                          </button>
                        </div>

                        {cardActions.length === 0 ? (
                          <p className="text-[11px] text-txt-muted italic">No interaction steps defined yet.</p>
                        ) : (
                          <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                            {cardActions.map((act, actIdx) => (
                              <div key={act.id || actIdx} className="flex items-center gap-1.5 text-[10px] p-1 bg-clinical-white rounded border border-clinical-border">
                                <span className="font-mono font-bold text-dark-chassis shrink-0">#{actIdx + 1}</span>
                                {act.role && act.role !== 'sequential' && (
                                  <span className="text-[8px] uppercase font-bold text-txt-muted">[{act.role}]</span>
                                )}
                                {act.section && (
                                  <span className="text-[8px] font-semibold text-txt-secondary bg-clinical-warm px-1 rounded">[{act.section}]</span>
                                )}
                                <span className="text-[9px] font-mono text-txt-muted">[{act.type || 'tap'}]</span>
                                <span className="truncate flex-1 font-medium">{act.description}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => openActionEditorForScreen(scr)}
                          className="mt-2 w-full py-1.5 rounded-pill bg-neon hover:bg-neon-bright text-dark-chassis text-[10px] font-bold flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add / Edit Steps in Action Drawer</span>
                        </button>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-dark-chassis block mb-1">Expected System Response</label>
                        <input
                          type="text"
                          defaultValue={scr.expected_behavior || ''}
                          onBlur={(e) => handleUpdateScreen(scr.id, { expected_behavior: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-clinical-white border border-clinical-border rounded text-[11px]"
                          placeholder="e.g. System validates and proceeds"
                        />
                      </div>

                    {/* AI Findings Tags if analyzed */}
                    {scr.ai_analysis && (
                      <div className="pt-2 border-t border-clinical-border space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-semibold text-dark-chassis">
                          <span className="flex items-center gap-1">
                            <BrainCircuit className="w-2.5 h-2.5 text-neon" />
                            AI Screen Elements
                          </span>
                          <span className="text-status-positive font-mono text-[9px]">CONFIRMED</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(scr.ai_analysis.elements || []).slice(0, 4).map((el, i) => (
                            <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-clinical-white border border-clinical-border text-dark-chassis">
                              {el.type}: {el.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* PII Redaction / Sensitive Data Masking Modal */}
      {redactingScreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-black/80 backdrop-blur-md">
          <div className="bg-clinical-surface rounded-[28px] border border-clinical-border shadow-modal max-w-2xl w-full p-6 space-y-4">
            
            <div className="flex items-center justify-between border-b border-clinical-border pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-status-critical" />
                <div>
                  <h3 className="text-sm font-bold text-dark-chassis">Mask Sensitive Clinical/Financial Data</h3>
                  <p className="text-xs text-txt-secondary">
                    Click and drag a box over account numbers, card details, phone numbers, or passwords.
                  </p>
                </div>
              </div>
              <button onClick={() => setRedactingScreen(null)} className="text-txt-muted hover:text-dark-chassis">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Canvas viewport */}
            <div className="flex justify-center bg-dark-chassis rounded-xl p-3 max-h-[60vh] overflow-auto">
              <canvas
                ref={canvasRef}
                onMouseDown={handleCanvasMouseDown}
                onMouseUp={handleCanvasMouseUp}
                className="max-h-[55vh] object-contain cursor-crosshair border border-dark-tertiary"
              />
            </div>

            {/* Redaction Actions */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-txt-muted">
                Redactions are baked permanently into the screenshot before AI transmission.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRedactingScreen(null)}
                  className="px-4 py-1.5 rounded-pill text-xs border border-clinical-border bg-clinical-white text-dark-chassis"
                >
                  Cancel
                </button>
                <button
                  onClick={saveRedaction}
                  className="px-5 py-1.5 rounded-pill text-xs font-bold bg-dark-chassis text-neon flex items-center gap-1.5 shadow"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save Redacted Image
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Live Screen Capture Studio Modal */}
      <LiveScreenCaptureModal
        isOpen={isLiveCaptureOpen}
        onClose={() => setIsLiveCaptureOpen(false)}
        onScreensCaptured={handleCaptureScreens}
        title="Live Screen Capture Studio"
        description="Share your iOS Simulator, Android Emulator, or Web App to snap live screens directly into this deck."
      />

      {/* Screen Action Editor Side Drawer */}
      <ScreenActionEditorDrawer
        isOpen={!!selectedScreenForActionEdit}
        screen={selectedScreenForActionEdit}
        onClose={() => setSelectedScreenForActionEdit(null)}
        onSave={handleSaveScreenActions}
        onDelete={(screenId) => {
          deleteScreen(screenId);
          setSelectedScreenForActionEdit(null);
        }}
      />

      {/* Executive 8-Pillar Blueprint Modal */}
      {isBlueprintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-black/80 backdrop-blur-md">
          <div className="bg-clinical-surface rounded-[28px] border border-clinical-border shadow-modal max-w-4xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-clinical-border pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-dark-chassis text-neon flex items-center justify-center font-bold">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-dark-chassis">8 Core Product & QA Blueprint Pillars</h3>
                  <p className="text-xs text-txt-secondary">
                    Feature-level specifications automatically synced into your QA Knowledge Base and printed on exported Storyboards.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsBlueprintModalOpen(false)} 
                className="text-txt-muted hover:text-dark-chassis p-1 rounded-lg hover:bg-clinical-warm transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {PILLAR_CONFIG.map((pillar) => (
                <div key={pillar.key} className="p-3 bg-clinical-white rounded-2xl border border-clinical-border space-y-1.5 flex flex-col">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-dark-chassis text-xs flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-neon shrink-0" />
                      <span>{pillar.label}</span>
                    </label>
                    <span className="text-[10px] font-mono text-txt-muted">Pillar</span>
                  </div>
                  <textarea
                    rows={4}
                    value={blueprintContext[pillar.key] || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBlueprintContext(prev => ({ ...prev, [pillar.key]: val }));
                    }}
                    placeholder={pillar.placeholder}
                    className="flex-1 w-full p-2.5 rounded-xl bg-clinical-warm border border-clinical-border text-dark-chassis text-xs leading-relaxed focus:outline-none focus:border-dark-chassis resize-none"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-clinical-border shrink-0">
              <span className="text-[11px] text-txt-muted hidden sm:inline">
                Specifications are saved directly to <code className="font-mono bg-clinical-warm px-1 rounded">qa_knowledge_items</code>.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsBlueprintModalOpen(false)}
                  className="min-h-[40px] px-4 py-2 rounded-pill text-xs font-semibold border border-clinical-border bg-clinical-white text-dark-chassis hover:bg-clinical-warm transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveBlueprint}
                  disabled={isSavingBlueprint}
                  className="min-h-[40px] px-5 py-2 rounded-pill text-xs font-bold bg-neon hover:bg-neon-bright text-dark-chassis shadow-card transition active:scale-95 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isSavingBlueprint ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  )}
                  <span>{isSavingBlueprint ? 'Saving Specifications...' : 'Save Blueprint Specifications'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
