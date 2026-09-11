'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Camera, 
  Check, 
  RotateCcw, 
  Timer, 
  X, 
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { SnappedScreen } from '@/lib/capture/useScreenCapture';

interface FloatingSnippingBarProps {
  snappedScreens: SnappedScreen[];
  onSnap: () => Promise<SnappedScreen | null>;
  onUndo: () => void;
  onFinish: () => void;
  onClose: () => void;
  videoResolution?: { width: number; height: number } | null;
  isStreaming?: boolean;
}

export function FloatingSnippingBar({
  snappedScreens,
  onSnap,
  onUndo,
  onFinish,
  onClose,
  videoResolution,
  isStreaming = true
}: FloatingSnippingBarProps) {
  const [justSnapped, setJustSnapped] = useState(false);
  const [delayCountdown, setDelayCountdown] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const lastScreen = snappedScreens.length > 0 ? snappedScreens[snappedScreens.length - 1] : null;

  // Handle immediate snap
  const handleSnapNow = useCallback(async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    setJustSnapped(true);
    setTimeout(() => setJustSnapped(false), 200);

    try {
      await onSnap();
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, onSnap]);

  // Handle 3s delay snap
  const handleDelaySnap = useCallback(() => {
    if (delayCountdown !== null || isCapturing) return;

    setDelayCountdown(3);
    let count = 3;

    timerRef.current = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setDelayCountdown(count);
      } else {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        setDelayCountdown(null);
        handleSnapNow();
      }
    }, 1000);
  }, [delayCountdown, isCapturing, handleSnapNow]);

  // Cancel timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Global keyboard listener inside the floating window
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        handleSnapNow();
      } else if (e.key === 'z' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onUndo();
      } else if (e.key === 'Escape') {
        if (delayCountdown !== null && timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          setDelayCountdown(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSnapNow, onUndo, delayCountdown]);

  return (
    <div className="w-full h-screen bg-[#1D1E1C] text-white flex flex-col justify-between p-2.5 box-border select-none relative overflow-hidden font-sans border border-[#323531]">
      
      {/* Shutter Visual Flash Effect */}
      {justSnapped && (
        <div className="absolute inset-0 z-50 bg-white/50 pointer-events-none transition-opacity duration-150" />
      )}

      {/* Top Status & Controls Header */}
      <div className="flex items-center justify-between gap-2 border-b border-[#2C2E2A] pb-1.5 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-2 h-2 rounded-full bg-[#F2F52A] shadow-[0_0_8px_#F2F52A] animate-pulse shrink-0" />
          <span className="font-bold text-[10px] tracking-wider text-white uppercase truncate">
            QA Snipping Tool
          </span>
          {videoResolution && (
            <span className="hidden xs:inline text-[9px] font-mono text-[#8F9489]">
              {videoResolution.width}x{videoResolution.height}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-mono font-bold text-[10px] text-[#1D1E1C] bg-[#F2F52A] px-2 py-0.5 rounded-full shadow-sm">
            {snappedScreens.length} {snappedScreens.length === 1 ? 'shot' : 'shots'}
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#8F9489] hover:text-white hover:bg-[#282A27] transition cursor-pointer"
            title="Minimize to QA Studio"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="flex items-center gap-2 py-1.5">
        
        {/* Primary Snap Button */}
        <button
          type="button"
          onClick={handleSnapNow}
          disabled={isCapturing || delayCountdown !== null}
          className="flex-1 bg-[#F2F52A] hover:bg-[#FAFCA5] active:scale-95 text-[#1D1E1C] font-extrabold text-xs py-2 px-3 rounded-full flex items-center justify-center gap-1.5 shadow-[0_2px_10px_rgba(242,245,42,0.3)] transition cursor-pointer disabled:opacity-50"
          title="Snap Screen (Spacebar)"
        >
          <Camera className="w-4 h-4 stroke-[2.5]" />
          <span>Snap Screen</span>
          <span className="text-[9px] font-mono opacity-70 bg-[#1D1E1C]/10 px-1 rounded">
            Space
          </span>
        </button>

        {/* 3s Delay Timer Button */}
        <button
          type="button"
          onClick={handleDelaySnap}
          disabled={isCapturing}
          className={`px-2.5 py-2 rounded-full text-xs font-semibold flex items-center justify-center gap-1 transition border cursor-pointer shrink-0 ${
            delayCountdown !== null
              ? 'bg-[#F2F52A] text-[#1D1E1C] border-[#F2F52A] animate-pulse font-bold'
              : 'bg-[#282A27] hover:bg-[#343733] text-[#D6D8D2] border-[#3B3E39]'
          }`}
          title="Snap with 3-second delay (for menus and hover states)"
        >
          <Timer className="w-3.5 h-3.5" />
          <span>{delayCountdown !== null ? `${delayCountdown}s...` : '3s'}</span>
        </button>

        {/* Undo Button */}
        <button
          type="button"
          onClick={onUndo}
          disabled={snappedScreens.length === 0}
          className="p-2 rounded-full bg-[#282A27] hover:bg-[#343733] text-[#D6D8D2] hover:text-rose-400 border border-[#3B3E39] disabled:opacity-30 disabled:hover:text-[#D6D8D2] transition cursor-pointer shrink-0"
          title="Undo last capture (Ctrl+Z)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Finish & Review Button */}
        <button
          type="button"
          onClick={onFinish}
          disabled={snappedScreens.length === 0}
          className="px-3 py-2 rounded-full bg-[#282A27] hover:bg-[#00FF88] text-[#D6D8D2] hover:text-[#1D1E1C] border border-[#3B3E39] hover:border-[#00FF88] font-bold text-xs flex items-center gap-1 transition cursor-pointer disabled:opacity-30 shrink-0"
          title="Finish capturing and return to QA Studio"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Done</span>
        </button>
      </div>

      {/* Footer Status & Mini Preview */}
      <div className="flex items-center justify-between text-[10px] text-[#8F9489] pt-1 border-t border-[#2C2E2A] shrink-0">
        {lastScreen ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <img
              src={lastScreen.previewUrl}
              alt="Last capture"
              className="w-5 h-5 rounded object-cover border border-[#3B3E39] shrink-0"
            />
            <span className="truncate text-white font-medium">
              Last: {lastScreen.name || `Screen ${snappedScreens.length}`}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-[#8F9489]">
            <Sparkles className="w-3 h-3 text-[#F2F52A]" />
            <span>Ready! Switch to your app & click Snap</span>
          </div>
        )}

        <span className="text-[9px] text-[#6F7469] font-mono shrink-0">
          Always On Top
        </span>
      </div>

    </div>
  );
}
