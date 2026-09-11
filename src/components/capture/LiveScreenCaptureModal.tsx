'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Camera, 
  Video, 
  VideoOff, 
  X, 
  Check, 
  RefreshCw, 
  ExternalLink, 
  Trash2, 
  Monitor, 
  Smartphone, 
  Maximize2,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Upload,
  FolderPlus,
  RotateCcw
} from 'lucide-react';
import { useScreenCapture, SnappedScreen } from '@/lib/capture/useScreenCapture';
import { FloatingSnippingBar } from '@/components/capture/FloatingSnippingBar';

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
    undoLastSnap,
    addLocalFiles,
    deleteSnappedScreen,
    clearSnappedScreens,
    isScreenCaptureSupported,
    isMobile,
    isPipSupported,
    isPipActive,
    pipWindow,
    openPipWindow,
    closePipWindow
  } = useScreenCapture();

  const [previewScreen, setPreviewScreen] = useState<SnappedScreen | null>(null);
  const [justSnapped, setJustSnapped] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addLocalFiles(e.target.files);
      e.target.value = '';
    }
  };

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

  const triggerSnap = async () => {
    setJustSnapped(true);
    setTimeout(() => setJustSnapped(false), 250);
    const snap = await snapFrame();
    return snap;
  };

  // Launch Picture-in-Picture floating snipping tool controller
  const handleLaunchPip = async () => {
    await openPipWindow({ width: 380, height: 160 });
  };

  const handleFinish = () => {
    if (snappedScreens.length === 0) return;
    onScreensCaptured(snappedScreens);
    stopCapture();
    closePipWindow();
    try {
      window.focus();
    } catch (e) {
      // ignore
    }
    onClose();
  };

  const handleCancel = () => {
    stopCapture();
    closePipWindow();
    clearSnappedScreens();
    try {
      window.focus();
    } catch (e) {
      // ignore
    }
    onClose();
  };

  if (!isOpen && !(isPipActive && pipWindow)) return null;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-dark-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-dark-chassis text-white rounded-[28px] sm:rounded-[32px] border border-dark-secondary shadow-modal overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-dark-secondary/80 flex items-center justify-between gap-3 shrink-0 bg-dark-chassis relative">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-neon text-dark-chassis flex items-center justify-center font-bold text-xs shadow-sm shadow-neon/30 shrink-0">
              {isMobile ? <Smartphone className="w-4 h-4 stroke-[2.5]" /> : <Camera className="w-4 h-4 stroke-[2.5]" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm sm:text-base text-white truncate">
                  {isMobile ? 'Mobile Screenshot Importer' : title}
                </h2>
                {isStreaming ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-neon/15 text-neon border border-neon/30 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-neon" />
                    LIVE
                  </span>
                ) : isMobile ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono text-neon bg-neon/10 border border-neon/30">
                    📱 MOBILE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono text-txt-muted bg-dark-secondary border border-dark-tertiary">
                    STANDBY
                  </span>
                )}
              </div>
              <p className="text-[11px] text-txt-muted truncate hidden sm:block">
                {isMobile ? 'Select screenshots taken on your mobile device to sequence directly into this flow.' : description}
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
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-rose-300">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
              {(isMobile || !isScreenCaptureSupported) && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1 rounded-pill bg-neon hover:bg-neon-bright text-dark-chassis text-[11px] font-bold shrink-0 cursor-pointer self-start sm:self-auto"
                >
                  Select Mobile Screenshots
                </button>
              )}
            </div>
          )}

          {/* Always-on-Top Floating Snipping Bar Banner */}
          {isStreaming && isPipSupported && !isPipActive && (
            <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-dark-secondary via-dark-tertiary/60 to-dark-secondary border border-neon/40 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-neon/15 border border-neon/30 flex items-center justify-center text-neon shrink-0">
                  <ExternalLink className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white">Testing another tab or app?</span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-neon text-dark-chassis">
                      ALWAYS ON TOP
                    </span>
                  </div>
                  <p className="text-[11px] text-txt-muted mt-0.5">
                    Launch the Floating Snipping Tool so you can take screenshots while navigating other web pages, iOS Simulator, or Android emulator.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLaunchPip}
                className="w-full sm:w-auto px-4 py-2 rounded-pill bg-neon hover:bg-neon-bright text-dark-chassis font-extrabold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-md shadow-neon/20 cursor-pointer shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Launch Floating Snipping Bar</span>
              </button>
            </div>
          )}

          {isStreaming && isPipActive && (
            <div className="p-3 rounded-2xl bg-neon/10 border border-neon/30 flex items-center justify-between gap-2.5 text-xs text-neon animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-neon animate-pulse" />
                <span className="font-semibold text-white">Floating Snipping Bar is active on your screen</span>
                <span className="text-[10px] text-txt-muted hidden sm:inline">— Switch to any tab or app and click "Snap Screen"!</span>
              </div>
              <button
                type="button"
                onClick={closePipWindow}
                className="text-[11px] text-txt-muted hover:text-white underline cursor-pointer"
              >
                Close Floating Bar
              </button>
            </div>
          )}

          {/* MAIN VIEWFINDER / CAPTURE CANVAS */}
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
              (isMobile || !isScreenCaptureSupported) ? (
                /* Mobile Device Screen Importer Flow */
                <div className="p-6 text-center max-w-md space-y-4 animate-in fade-in">
                  <div className="w-16 h-16 rounded-full bg-dark-secondary border border-neon/40 flex items-center justify-center mx-auto text-neon shadow-lg shadow-neon/15 relative">
                    <Smartphone className="w-8 h-8" />
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-neon"></span>
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-dark-secondary text-neon border border-neon/30">
                      <span>Mobile Mode</span>
                    </div>
                    <h3 className="font-bold text-sm sm:text-base text-white">
                      Import Mobile Screenshots
                    </h3>
                    <p className="text-xs text-txt-muted leading-relaxed">
                      Android and iOS block web browsers from screen recording background apps for OS security. Simply take screenshots on your phone (<kbd className="px-1.5 py-0.5 rounded bg-dark-secondary border border-dark-tertiary text-white font-mono text-[10px]">Power + Vol Down</kbd>), then tap below.
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full sm:w-auto px-6 py-3 rounded-pill bg-neon hover:bg-neon-bright text-dark-chassis text-xs font-bold transition flex items-center justify-center gap-2 active:scale-95 shadow-card cursor-pointer"
                    >
                      <Smartphone className="w-4 h-4 stroke-[2.5]" />
                      <span>Select Mobile Screenshots</span>
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-dark-secondary/50 border border-dark-tertiary/40 text-[11px] text-txt-muted text-left space-y-1">
                    <div className="flex items-center gap-1.5 text-white font-medium text-xs">
                      <span>Batch Selection Supported</span>
                    </div>
                    <p className="text-[10px] text-txt-secondary leading-normal">
                      Select multiple screenshots at once from your photos or screenshots gallery. The system will automatically sequence and map them into your Visual User Journey.
                    </p>
                  </div>
                </div>
              ) : (
                /* Desktop Live Screen Streaming Flow */
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

                  <div className="pt-1 flex flex-col items-center gap-2">
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

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-txt-muted hover:text-white transition flex items-center gap-1.5 py-1 px-3 rounded-pill hover:bg-dark-secondary/60 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Or import existing screenshots from file</span>
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
              )
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

                {/* Undo Last Capture Button */}
                {snappedScreens.length > 0 && (
                  <button
                    type="button"
                    onClick={undoLastSnap}
                    className="px-3 py-2 rounded-pill bg-dark-chassis hover:bg-dark-tertiary text-txt-muted hover:text-white text-xs font-semibold border border-dark-tertiary transition cursor-pointer flex items-center gap-1.5"
                    title="Undo last capture"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Undo</span>
                  </button>
                )}

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
                    title="Pop out a floating snipping bar so you can snap while interacting with any other app"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">
                      {isPipActive ? 'Floating Widget Active' : 'Pop Out Floating Bar'}
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

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] text-neon hover:text-neon-bright flex items-center gap-1 transition hover:underline cursor-pointer font-medium"
                >
                  <FolderPlus className="w-3 h-3" />
                  <span>+ Add More</span>
                </button>

                {snappedScreens.length > 0 && (
                  <button
                    type="button"
                    onClick={clearSnappedScreens}
                    className="text-[11px] text-txt-muted hover:text-rose-400 transition hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>
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

        {/* Hidden File Input for Mobile / Local Screenshot Import */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          accept="image/*"
          multiple
          className="hidden"
        />

      </div>
    </div>
    )}

    {/* Document Picture-in-Picture Floating Bar Portal */}
    {isPipActive && pipWindow && createPortal(
      <FloatingSnippingBar
        snappedScreens={snappedScreens}
        onSnap={snapFrame}
        onUndo={undoLastSnap}
        onFinish={handleFinish}
        onClose={closePipWindow}
        videoResolution={videoResolution}
        isStreaming={isStreaming}
      />,
      pipWindow.document.body
    )}
  </>
  );
}
