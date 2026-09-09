'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  Camera, 
  Video, 
  VideoOff, 
  X, 
  Check, 
  RefreshCw, 
  ExternalLink, 
  Trash2, 
  Sparkles, 
  Monitor, 
  Smartphone, 
  Maximize2,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { useScreenCapture, SnappedScreen } from '@/lib/capture/useScreenCapture';

interface LiveScreenCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScreensCaptured: (screens: SnappedScreen[]) => void;
  title?: string;
  description?: string;
}

export function LiveScreenCaptureModal({
  isOpen,
  onClose,
  onScreensCaptured,
  title = 'Live Screen Capture Studio',
  description = 'Stream your iOS Simulator, Android Emulator, or Web App to snap live screens directly into the feature journey.'
}: LiveScreenCaptureModalProps) {
  const {
    isStreaming,
    isStarting,
    videoRef,
    videoResolution,
    snappedScreens,
    error,
    startCapture,
    stopCapture,
    snapFrame,
    deleteSnappedScreen,
    clearSnappedScreens,
    isPipSupported,
    isPipActive,
    openPipWindow,
    closePipWindow
  } = useScreenCapture();

  const [previewScreen, setPreviewScreen] = useState<SnappedScreen | null>(null);
  const [justSnapped, setJustSnapped] = useState(false);
  const pipCountRef = useRef<HTMLSpanElement | null>(null);

  // Keyboard shortcut listener: Space or Enter to snap when modal is active
  useEffect(() => {
    if (!isOpen || !isStreaming) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        triggerSnap();
      } else if (e.key === 'Escape' && !previewScreen) {
        handleCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isStreaming, previewScreen]);

  // Update PiP window counter when snappedScreens changes
  useEffect(() => {
    if (pipCountRef.current) {
      pipCountRef.current.textContent = `${snappedScreens.length} captured`;
    }
  }, [snappedScreens.length]);

  const triggerSnap = async () => {
    setJustSnapped(true);
    setTimeout(() => setJustSnapped(false), 250);
    const snap = await snapFrame();
    return snap;
  };

  // Launch Picture-in-Picture floating pill controller
  const handleLaunchPip = async () => {
    const pipWin = await openPipWindow();
    if (!pipWin) return;

    // Render lightweight floating controller directly into PiP document body
    pipWin.document.body.innerHTML = `
      <div style="
        background: #1D1E1C;
        color: #ffffff;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        padding: 14px;
        height: 100vh;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        user-select: none;
      ">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #323531; padding-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <div style="width: 8px; height: 8px; border-radius: 50%; background: #00FF88; box-shadow: 0 0 8px #00FF88;"></div>
            <span style="font-size: 11px; font-weight: 700; letter-spacing: 0.5px; color: #ffffff;">QA STUDIO CAPTURE</span>
          </div>
          <span id="pip-counter" style="font-size: 10px; font-family: monospace; font-weight: 700; color: #00FF88; background: rgba(0,255,136,0.15); padding: 2px 6px; border-radius: 10px; border: 1px solid rgba(0,255,136,0.3);">
            ${snappedScreens.length} captured
          </span>
        </div>

        <div style="padding: 10px 0;">
          <button id="pip-snap-btn" style="
            width: 100%;
            background: #00FF88;
            color: #1D1E1C;
            border: none;
            border-radius: 9999px;
            padding: 12px 16px;
            font-size: 13px;
            font-weight: 800;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            cursor: pointer;
            box-shadow: 0 2px 10px rgba(0,255,136,0.3);
            transition: transform 0.1s, background 0.1s;
          ">
            <span>📸 Snap Screen (Space)</span>
          </button>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span style="font-size: 9px; color: #8F9489;">Tap while testing your app</span>
          <button id="pip-done-btn" style="
            background: #282A27;
            color: #D6D8D2;
            border: 1px solid #3B3E39;
            border-radius: 9999px;
            padding: 4px 10px;
            font-size: 10px;
            font-weight: 600;
            cursor: pointer;
          ">
            Done & Close
          </button>
        </div>
      </div>
    `;

    pipCountRef.current = pipWin.document.getElementById('pip-counter') as HTMLSpanElement;

    const snapBtn = pipWin.document.getElementById('pip-snap-btn');
    if (snapBtn) {
      snapBtn.addEventListener('click', async () => {
        snapBtn.style.transform = 'scale(0.95)';
        setTimeout(() => { snapBtn.style.transform = 'scale(1)'; }, 100);
        await triggerSnap();
      });
    }

    const doneBtn = pipWin.document.getElementById('pip-done-btn');
    if (doneBtn) {
      doneBtn.addEventListener('click', () => {
        closePipWindow();
      });
    }

    // Keyboard shortcut in PiP window
    pipWin.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        triggerSnap();
      }
    });
  };

  const handleFinish = () => {
    if (snappedScreens.length === 0) return;
    onScreensCaptured(snappedScreens);
    stopCapture();
    closePipWindow();
    onClose();
  };

  const handleCancel = () => {
    stopCapture();
    closePipWindow();
    clearSnappedScreens();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-dark-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-dark-chassis text-white rounded-[28px] sm:rounded-[32px] border border-dark-secondary shadow-modal overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-dark-secondary/80 flex items-center justify-between gap-3 shrink-0 bg-dark-chassis relative">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-neon text-dark-chassis flex items-center justify-center font-bold text-xs shadow-sm shadow-neon/30 shrink-0">
              <Camera className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm sm:text-base text-white truncate">{title}</h2>
                {isStreaming ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-neon/15 text-neon border border-neon/30 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-neon" />
                    LIVE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono text-txt-muted bg-dark-secondary border border-dark-tertiary">
                    STANDBY
                  </span>
                )}
              </div>
              <p className="text-[11px] text-txt-muted truncate hidden sm:block">
                {description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {videoResolution && (
              <span className="hidden sm:inline-block px-2.5 py-1 rounded-pill bg-dark-secondary text-txt-muted text-[10px] font-mono border border-dark-tertiary">
                {videoResolution.width} × {videoResolution.height}
              </span>
            )}
            <button
              onClick={handleCancel}
              className="p-1.5 rounded-full hover:bg-dark-secondary text-txt-muted hover:text-white transition cursor-pointer"
              title="Close Capture Studio"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* Error Alert */}
          {error && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* MAIN VIEWFINDER CANVAS */}
          <div className="relative rounded-2xl bg-black border border-dark-secondary overflow-hidden flex items-center justify-center min-h-[260px] sm:min-h-[340px] max-h-[50vh]">
            
            {/* Shutter Visual Flash */}
            {justSnapped && (
              <div className="absolute inset-0 z-30 bg-white/40 pointer-events-none transition-opacity duration-200" />
            )}

            {/* Video Feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full max-h-[50vh] object-contain transition-opacity duration-300 ${
                isStreaming ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
              }`}
            />

            {/* Inactive Standby Screen */}
            {!isStreaming && (
              <div className="p-6 text-center max-w-md space-y-4 animate-in fade-in">
                <div className="w-16 h-16 rounded-full bg-dark-secondary border border-dark-tertiary flex items-center justify-center mx-auto text-neon shadow-lg shadow-neon/10">
                  <Monitor className="w-8 h-8" />
                </div>
                
                <div className="space-y-1.5">
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    Ready to Stream & Snap Screens
                  </h3>
                  <p className="text-xs text-txt-muted leading-relaxed">
                    Select your <strong>iOS Simulator</strong>, <strong>Android Emulator</strong>, or <strong>Web Browser Window</strong> to begin capturing screens.
                  </p>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={startCapture}
                    disabled={isStarting}
                    className="px-5 py-3 rounded-pill bg-neon hover:bg-neon-bright text-dark-chassis text-xs font-bold transition flex items-center gap-2 mx-auto active:scale-95 shadow-card cursor-pointer disabled:opacity-60"
                  >
                    {isStarting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Video className="w-4 h-4 stroke-[2.5]" />
                    )}
                    <span>Select Window / Simulator to Share</span>
                  </button>
                </div>

                {/* Helpful tips ribbon */}
                <div className="grid grid-cols-3 gap-2 pt-2 text-[10px] text-txt-muted">
                  <div className="p-2 rounded-xl bg-dark-secondary/60 border border-dark-tertiary/40">
                    <span className="font-semibold block text-white">📱 iOS Simulator</span>
                    <span>Xcode Simulator window</span>
                  </div>
                  <div className="p-2 rounded-xl bg-dark-secondary/60 border border-dark-tertiary/40">
                    <span className="font-semibold block text-white">🤖 Android Studio</span>
                    <span>AVD emulator window</span>
                  </div>
                  <div className="p-2 rounded-xl bg-dark-secondary/60 border border-dark-tertiary/40">
                    <span className="font-semibold block text-white">🌐 Web Apps</span>
                    <span>Any Chrome/Safari window</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ACTIVE STREAMING TOOLBAR */}
          {isStreaming && (
            <div className="p-3 sm:p-4 rounded-2xl bg-dark-secondary/70 border border-dark-tertiary/70 flex flex-wrap items-center justify-between gap-3">
              {/* Primary Snap Button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={triggerSnap}
                  className="px-5 py-2.5 rounded-pill bg-neon hover:bg-neon-bright text-dark-chassis text-xs sm:text-sm font-extrabold transition flex items-center gap-2 active:scale-95 shadow-sm shadow-neon/40 cursor-pointer group"
                >
                  <Camera className="w-4 h-4 stroke-[2.5] group-hover:scale-110 transition-transform" />
                  <span>Snap Screen</span>
                  <span className="hidden sm:inline px-1.5 py-0.5 rounded text-[10px] font-mono bg-dark-chassis text-neon">
                    Space
                  </span>
                </button>

                {/* Pop Out PiP Button */}
                {isPipSupported && (
                  <button
                    type="button"
                    onClick={handleLaunchPip}
                    disabled={isPipActive}
                    className={`px-3.5 py-2 rounded-pill text-xs font-semibold flex items-center gap-1.5 transition border cursor-pointer ${
                      isPipActive
                        ? 'bg-dark-chassis text-neon border-neon/40'
                        : 'bg-dark-secondary hover:bg-dark-tertiary text-txt-secondary hover:text-white border-dark-tertiary'
                    }`}
                    title="Pop out a tiny floating controller so you can snap while interacting with your simulator"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">
                      {isPipActive ? 'Floating Widget Active' : 'Pop Out Floating Controller'}
                    </span>
                  </button>
                )}
              </div>

              {/* Stop Stream Button */}
              <button
                type="button"
                onClick={stopCapture}
                className="px-3 py-1.5 rounded-pill bg-dark-chassis hover:bg-rose-500/20 text-txt-muted hover:text-rose-400 text-xs font-semibold border border-dark-tertiary hover:border-rose-500/40 transition cursor-pointer flex items-center gap-1.5"
              >
                <VideoOff className="w-3.5 h-3.5" />
                <span>Switch / Stop Share</span>
              </button>
            </div>
          )}

          {/* CAPTURED SCREENS FILMSTRIP */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-white">
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-neon" />
                <span>Captured Flow Sequence</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-dark-secondary text-txt-muted border border-dark-tertiary">
                  {snappedScreens.length} {snappedScreens.length === 1 ? 'screen' : 'screens'}
                </span>
              </div>

              {snappedScreens.length > 0 && (
                <button
                  type="button"
                  onClick={clearSnappedScreens}
                  className="text-[11px] text-txt-muted hover:text-rose-400 transition hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Filmstrip Container */}
            {snappedScreens.length === 0 ? (
              <div className="py-6 px-4 rounded-2xl bg-dark-secondary/30 border border-dashed border-dark-tertiary text-center text-xs text-txt-muted">
                No screenshots captured yet. Click <strong>"Snap Screen"</strong> or press <strong>Space</strong> while walking through your app.
              </div>
            ) : (
              <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 no-scrollbar">
                {snappedScreens.map((screen, idx) => (
                  <div
                    key={screen.id}
                    className="relative group shrink-0 w-28 sm:w-32 rounded-xl bg-dark-secondary border border-dark-tertiary overflow-hidden shadow-sm transition hover:border-neon/60"
                  >
                    {/* Index Badge */}
                    <div className="absolute top-1.5 left-1.5 z-10 w-5 h-5 rounded-full bg-dark-chassis/90 text-neon font-mono font-bold text-[10px] flex items-center justify-center border border-neon/30">
                      {idx + 1}
                    </div>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => deleteSnappedScreen(screen.id)}
                      className="absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full bg-dark-chassis/90 hover:bg-rose-500 text-txt-muted hover:text-white transition flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Remove screen"
                    >
                      <X className="w-3 h-3" />
                    </button>

                    {/* Thumbnail Image */}
                    <div 
                      onClick={() => setPreviewScreen(screen)}
                      className="aspect-video w-full bg-black/60 cursor-pointer flex items-center justify-center overflow-hidden"
                    >
                      <img
                        src={screen.previewUrl}
                        alt={`Screen ${idx + 1}`}
                        className="w-full h-full object-contain hover:scale-105 transition-transform"
                      />
                    </div>

                    {/* Metadata Footer */}
                    <div className="p-1.5 text-[10px] font-mono text-txt-muted truncate bg-dark-secondary/90 border-t border-dark-tertiary">
                      {screen.width} × {screen.height}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-4 border-t border-dark-secondary/80 flex items-center justify-between gap-3 bg-dark-chassis shrink-0">
          <div className="text-xs text-txt-muted font-mono hidden sm:block">
            {snappedScreens.length > 0 ? (
              <span className="text-neon flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Ready to synthesize into Visual Journey DAG
              </span>
            ) : (
              <span>Snap at least 1 screen to import</span>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 rounded-pill bg-dark-secondary hover:bg-dark-tertiary text-txt-secondary hover:text-white text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleFinish}
              disabled={snappedScreens.length === 0}
              className="px-5 py-2 rounded-pill bg-neon hover:bg-neon-bright text-dark-chassis text-xs font-bold transition flex items-center gap-2 active:scale-95 shadow-sm shadow-neon/40 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Done & Load into Journey ({snappedScreens.length})</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Lightbox Image Preview Modal */}
        {previewScreen && (
          <div 
            onClick={() => setPreviewScreen(null)}
            className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 animate-in fade-in cursor-pointer"
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

      </div>
    </div>
  );
}
