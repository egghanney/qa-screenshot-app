'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Check, 
  CornerDownRight, 
  ArrowUp, 
  ArrowDown, 
  MousePointer, 
  Keyboard, 
  MoveRight, 
  CheckCircle2, 
  Eye, 
  Layers
} from 'lucide-react';
import { StoryboardScreen, ScreenAction } from '@/lib/types';

interface ScreenActionEditorDrawerProps {
  isOpen: boolean;
  screen: StoryboardScreen | null;
  onClose: () => void;
  onSave: (updated: StoryboardScreen) => void;
  onDelete?: (screenId: string) => void;
}

export function ScreenActionEditorDrawer({
  isOpen,
  screen,
  onClose,
  onSave,
  onDelete
}: ScreenActionEditorDrawerProps) {
  const [name, setName] = useState('');
  const [nestLevel, setNestLevel] = useState<number>(0);
  const [actions, setActions] = useState<ScreenAction[]>([]);
  const [expectedResult, setExpectedResult] = useState('');
  const [newActionText, setNewActionText] = useState('');
  const [newActionType, setNewActionType] = useState<ScreenAction['type']>('tap');

  useEffect(() => {
    if (screen) {
      setName(screen.name || '');
      const initialNest = typeof screen.nestLevel === 'number' 
        ? screen.nestLevel 
        : (screen.isSubScreen ? 1 : 0);
      setNestLevel(initialNest);
      setActions(screen.actions ? [...screen.actions] : []);
      setExpectedResult(screen.expectedResult || '');
      setNewActionText('');
      setNewActionType('tap');
    }
  }, [screen]);

  if (!isOpen || !screen) return null;

  const handleAddAction = () => {
    if (!newActionText.trim()) return;
    const newAct: ScreenAction = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      order: actions.length + 1,
      type: newActionType,
      description: newActionText.trim()
    };
    setActions([...actions, newAct]);
    setNewActionText('');
  };

  const handleDeleteAction = (actionId: string) => {
    setActions(actions.filter(a => a.id !== actionId).map((a, idx) => ({ ...a, order: idx + 1 })));
  };

  const handleMoveAction = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= actions.length) return;
    const updated = [...actions];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setActions(updated.map((a, idx) => ({ ...a, order: idx + 1 })));
  };

  const handleSave = () => {
    onSave({
      ...screen,
      name: name.trim() || screen.name,
      isSubScreen: nestLevel > 0,
      nestLevel,
      actions,
      expectedResult: expectedResult.trim()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 bg-dark-black/75 backdrop-blur-sm flex justify-end animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-dark-chassis text-white h-full shadow-2xl border-l border-dark-secondary flex flex-col animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-dark-secondary/90 flex items-center justify-between gap-3 shrink-0 bg-dark-chassis">
          <div className="flex items-center gap-2.5">
            <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold shadow-sm ${
              nestLevel === 2
                ? 'bg-sky-400 text-dark-chassis'
                : nestLevel === 1
                ? 'bg-neon text-dark-chassis'
                : 'bg-dark-secondary text-white border border-dark-tertiary'
            }`}>
              {screen.stepBadge || '#'}
            </span>
            <div>
              <h3 className="font-bold text-sm text-white">Screen Details & Actions</h3>
              <p className="text-[11px] text-txt-muted">Configure step name, 3-tier hierarchy, and sequential actions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-dark-secondary text-txt-muted hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Top Screen Card Preview */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-dark-secondary/50 border border-dark-tertiary">
            <div className="w-16 h-24 rounded-xl bg-black overflow-hidden shrink-0 border border-dark-tertiary flex items-center justify-center">
              <img 
                src={screen.previewUrl} 
                alt="Screen preview" 
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <label className="text-[10px] font-semibold text-txt-muted uppercase tracking-wider block">
                Screen Step Title
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Recipient Number"
                className="w-full px-3 py-1.5 rounded-xl bg-dark-chassis border border-dark-tertiary text-xs text-white focus:border-neon focus:outline-none transition"
              />
              <span className="text-[10px] text-txt-muted block">
                Dimensions: {screen.width || '—'} × {screen.height || '—'} px
              </span>
            </div>
          </div>

          {/* 3-Tier Step Hierarchy Selector */}
          <div className="p-3.5 rounded-2xl bg-dark-secondary/40 border border-dark-tertiary space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CornerDownRight className="w-4 h-4 text-neon shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-white">Screen Step Hierarchy</h4>
                  <p className="text-[10px] text-txt-muted">
                    Set primary step (#1), sub-screen (#1a), or nested sub-of-sub (#1a.1)
                  </p>
                </div>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                nestLevel === 2
                  ? 'bg-sky-400 text-dark-chassis'
                  : nestLevel === 1
                  ? 'bg-neon text-dark-chassis'
                  : 'bg-dark-chassis text-txt-muted border border-dark-tertiary'
              }`}>
                {nestLevel === 2 ? 'Level 2: Sub-Sub' : nestLevel === 1 ? 'Level 1: Sub' : 'Level 0: Primary'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-dark-chassis border border-dark-tertiary">
              <button
                type="button"
                onClick={() => setNestLevel(0)}
                className={`py-2 px-2 rounded-lg text-center transition cursor-pointer flex flex-col items-center gap-0.5 ${
                  nestLevel === 0
                    ? 'bg-dark-secondary text-white font-bold border border-dark-tertiary/80 shadow-sm'
                    : 'text-txt-muted hover:text-white'
                }`}
              >
                <span className="text-[10px] font-mono font-bold">#1, #2</span>
                <span className="text-[11px] font-medium">Primary</span>
              </button>

              <button
                type="button"
                onClick={() => setNestLevel(1)}
                className={`py-2 px-2 rounded-lg text-center transition cursor-pointer flex flex-col items-center gap-0.5 ${
                  nestLevel === 1
                    ? 'bg-neon text-dark-chassis font-bold shadow-sm shadow-neon/20'
                    : 'text-txt-muted hover:text-white'
                }`}
              >
                <span className="text-[10px] font-mono font-bold">#1a, #1b</span>
                <span className="text-[11px] font-medium">Sub-Screen</span>
              </button>

              <button
                type="button"
                onClick={() => setNestLevel(2)}
                className={`py-2 px-2 rounded-lg text-center transition cursor-pointer flex flex-col items-center gap-0.5 ${
                  nestLevel === 2
                    ? 'bg-sky-400 text-dark-chassis font-bold shadow-sm shadow-sky-400/20'
                    : 'text-txt-muted hover:text-white'
                }`}
              >
                <span className="text-[10px] font-mono font-bold">#1a.1, #1a.2</span>
                <span className="text-[11px] font-medium">Sub of Sub</span>
              </button>
            </div>
            
            <p className="text-[10px] text-txt-muted">
              {nestLevel === 0 && 'Main step in the user flow. Starts or advances the primary numbered sequence (#1, #2, ...).'}
              {nestLevel === 1 && 'Intermediate overlay, drawer, or modal under the active primary step (e.g. #1a, #1b).'}
              {nestLevel === 2 && 'Nested micro-dialog, popup, or confirmation inside a sub-screen (e.g. #1a.1, #1a.2).'}
            </p>
          </div>

          {/* User Actions Sequence */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-neon" />
                <h4 className="text-xs font-bold text-white">Sequential User Actions ({actions.length})</h4>
              </div>
              <span className="text-[10px] text-txt-muted">Printed on downloaded storyboard</span>
            </div>

            {/* Actions List */}
            {actions.length === 0 ? (
              <div className="p-3 rounded-xl bg-dark-secondary/30 border border-dashed border-dark-tertiary text-center text-xs text-txt-muted">
                No micro-actions added yet. Add steps below (e.g. tap button, type input).
              </div>
            ) : (
              <div className="space-y-2">
                {actions.map((act, idx) => (
                  <div 
                    key={act.id} 
                    className="p-2.5 rounded-xl bg-dark-secondary/70 border border-dark-tertiary flex items-center justify-between gap-2 text-xs group"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="w-4 h-4 rounded-full bg-dark-chassis text-neon text-[10px] font-mono font-bold flex items-center justify-center shrink-0 border border-neon/30">
                        {idx + 1}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider bg-dark-chassis text-txt-secondary border border-dark-tertiary shrink-0">
                        {act.type || 'tap'}
                      </span>
                      <span className="text-xs text-white truncate">{act.description}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => handleMoveAction(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded hover:bg-dark-chassis text-txt-muted hover:text-white disabled:opacity-20 cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveAction(idx, 'down')}
                        disabled={idx === actions.length - 1}
                        className="p-1 rounded hover:bg-dark-chassis text-txt-muted hover:text-white disabled:opacity-20 cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAction(act.id)}
                        className="p-1 rounded hover:bg-rose-500/20 text-txt-muted hover:text-rose-400 cursor-pointer"
                        title="Remove Action"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Action Input Bar */}
            <div className="p-3 rounded-2xl bg-dark-secondary/60 border border-dark-tertiary space-y-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-txt-muted block">
                + Add Micro-Action
              </span>
              
              {/* Action Type Chips */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { type: 'tap', label: 'Tap', icon: MousePointer },
                  { type: 'type', label: 'Type', icon: Keyboard },
                  { type: 'swipe', label: 'Swipe', icon: MoveRight },
                  { type: 'verify', label: 'Verify', icon: CheckCircle2 }
                ].map(({ type, label, icon: Icon }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setNewActionType(type as any)}
                    className={`px-2.5 py-1 rounded-pill text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer ${
                      newActionType === type
                        ? 'bg-neon text-dark-chassis font-bold'
                        : 'bg-dark-chassis text-txt-secondary hover:text-white border border-dark-tertiary'
                    }`}
                  >
                    <Icon className="w-2.5 h-2.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* Input & Add button */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newActionText}
                  onChange={(e) => setNewActionText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddAction();
                    }
                  }}
                  placeholder={`e.g. ${newActionType === 'type' ? 'Enter "GHS 1.00"' : 'Tap "Confirm & Pay" button'}`}
                  className="flex-1 px-3 py-2 rounded-xl bg-dark-chassis border border-dark-tertiary text-xs text-white focus:border-neon focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={handleAddAction}
                  disabled={!newActionText.trim()}
                  className="px-3.5 py-2 rounded-xl bg-neon hover:bg-neon-bright text-dark-chassis text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </div>

          {/* Expected Behavior / System Response */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-white block">
              Expected System Response (Optional)
            </label>
            <input
              type="text"
              value={expectedResult}
              onChange={(e) => setExpectedResult(e.target.value)}
              placeholder="e.g. Pin confirmation modal appears on screen"
              className="w-full px-3 py-2 rounded-xl bg-dark-secondary/60 border border-dark-tertiary text-xs text-white focus:border-neon focus:outline-none transition"
            />
            <span className="text-[10px] text-txt-muted block">
              Printed on QA Storyboard card as the expected outcome
            </span>
          </div>

          {/* Delete Screen Option */}
          {onDelete && (
            <div className="pt-4 border-t border-dark-secondary">
              <button
                type="button"
                onClick={() => {
                  if (confirm('Delete this screen from the storyboard?')) {
                    onDelete(screen.id);
                    onClose();
                  }
                }}
                className="text-xs text-rose-400 hover:text-rose-300 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove screen from storyboard</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-dark-secondary/90 flex items-center justify-between gap-3 bg-dark-chassis shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-pill bg-dark-secondary hover:bg-dark-tertiary text-txt-secondary hover:text-white text-xs font-semibold transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-pill bg-neon hover:bg-neon-bright text-dark-chassis text-xs font-bold transition flex items-center gap-1.5 shadow-card cursor-pointer"
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Apply Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
}
