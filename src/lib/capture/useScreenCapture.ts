'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export interface SnappedScreen {
  id: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  timestamp: number;
  name?: string;
}

export interface UseScreenCaptureReturn {
  isStreaming: boolean;
  isStarting: boolean;
  stream: MediaStream | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoResolution: { width: number; height: number } | null;
  snappedScreens: SnappedScreen[];
  error: string | null;
  startCapture: () => Promise<boolean>;
  stopCapture: () => void;
  snapFrame: () => Promise<SnappedScreen | null>;
  deleteSnappedScreen: (id: string) => void;
  clearSnappedScreens: () => void;
  isPipSupported: boolean;
  isPipActive: boolean;
  openPipWindow: (onSnapCallback?: () => void) => Promise<Window | null>;
  closePipWindow: () => void;
}

export function useScreenCapture(): UseScreenCaptureReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoResolution, setVideoResolution] = useState<{ width: number; height: number } | null>(null);
  const [snappedScreens, setSnappedScreens] = useState<SnappedScreen[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPipActive, setIsPipActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pipWindowRef = useRef<Window | null>(null);

  const isPipSupported = typeof window !== 'undefined' && 'documentPictureInPicture' in window;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (pipWindowRef.current) {
        pipWindowRef.current.close();
      }
    };
  }, [stream]);

  // Handle stream end (e.g. user clicks "Stop Sharing" on browser's native banner)
  const handleTrackEnded = useCallback(() => {
    setIsStreaming(false);
    setStream(null);
    setVideoResolution(null);
    if (pipWindowRef.current) {
      pipWindowRef.current.close();
      pipWindowRef.current = null;
      setIsPipActive(false);
    }
  }, []);

  // Request display media
  const startCapture = useCallback(async (): Promise<boolean> => {
    setError(null);
    setIsStarting(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('Screen capture is not supported in this browser. Please use Chrome, Edge, Safari, or Firefox.');
      }

      // Request live window/display capture with high framerate and resolution preference
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'window',
          frameRate: { ideal: 30, max: 60 }
        } as any,
        audio: false
      });

      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.addEventListener('ended', handleTrackEnded);
      }

      setStream(mediaStream);
      setIsStreaming(true);

      // Attach to hidden/active video element
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().catch(console.error);
            setVideoResolution({
              width: videoRef.current.videoWidth,
              height: videoRef.current.videoHeight
            });
          }
        };
      }

      return true;
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        // User cancelled the native browser window picker
        setError(null);
      } else {
        console.error('Failed to start screen capture:', err);
        setError(err.message || 'Unable to access screen. Please check permissions.');
      }
      return false;
    } finally {
      setIsStarting(false);
    }
  }, [handleTrackEnded]);

  // Stop active capture session
  const stopCapture = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setStream(null);
    setVideoResolution(null);
    if (pipWindowRef.current) {
      pipWindowRef.current.close();
      pipWindowRef.current = null;
      setIsPipActive(false);
    }
  }, [stream]);

  // Capture current video frame to high-res PNG file
  const snapFrame = useCallback(async (): Promise<SnappedScreen | null> => {
    const video = videoRef.current;
    if (!video || !isStreaming || video.videoWidth === 0 || video.videoHeight === 0) {
      return null;
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return null;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png', 1.0);
      });

      if (!blob) return null;

      const timestamp = Date.now();
      const timeStr = new Date(timestamp).toTimeString().split(' ')[0].replace(/:/g, '');
      const fileName = `Capture-${timeStr}-${timestamp.toString().slice(-4)}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });
      const previewUrl = URL.createObjectURL(blob);

      const newScreen: SnappedScreen = {
        id: `snap_${timestamp}_${Math.random().toString(36).substring(2, 7)}`,
        file,
        previewUrl,
        width: canvas.width,
        height: canvas.height,
        timestamp,
        name: `Screen ${snappedScreens.length + 1}`
      };

      setSnappedScreens((prev) => [...prev, newScreen]);

      // Provide subtle audio feedback (synthetic camera shutter click)
      playShutterSound();

      return newScreen;
    } catch (err) {
      console.error('Failed to snap screen frame:', err);
      return null;
    }
  }, [isStreaming, snappedScreens.length]);

  const deleteSnappedScreen = useCallback((id: string) => {
    setSnappedScreens((prev) => {
      const target = prev.find((s) => s.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((s) => s.id !== id);
    });
  }, []);

  const clearSnappedScreens = useCallback(() => {
    setSnappedScreens((prev) => {
      prev.forEach((s) => {
        if (s.previewUrl) URL.revokeObjectURL(s.previewUrl);
      });
      return [];
    });
  }, []);

  // Document Picture-in-Picture Floating Controller
  const openPipWindow = useCallback(async (onSnapCallback?: () => void): Promise<Window | null> => {
    if (!isPipSupported) return null;

    try {
      // @ts-ignore - Document Picture-in-Picture API
      const pipWindow = await window.documentPictureInPicture.requestWindow({
        width: 340,
        height: 190
      });

      pipWindowRef.current = pipWindow;
      setIsPipActive(true);

      // Copy stylesheet links from main document to PiP window so styling matches
      Array.from(document.styleSheets).forEach((styleSheet) => {
        try {
          if (styleSheet.href) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = styleSheet.href;
            pipWindow.document.head.appendChild(link);
          } else if (styleSheet.cssRules) {
            const style = document.createElement('style');
            Array.from(styleSheet.cssRules).forEach((rule) => {
              style.appendChild(document.createTextNode(rule.cssText));
            });
            pipWindow.document.head.appendChild(style);
          }
        } catch (e) {
          // Cross-origin stylesheets
        }
      });

      pipWindow.addEventListener('pagehide', () => {
        pipWindowRef.current = null;
        setIsPipActive(false);
      });

      return pipWindow;
    } catch (err) {
      console.error('Failed to open Picture-in-Picture window:', err);
      return null;
    }
  }, [isPipSupported]);

  const closePipWindow = useCallback(() => {
    if (pipWindowRef.current) {
      pipWindowRef.current.close();
      pipWindowRef.current = null;
      setIsPipActive(false);
    }
  }, []);

  return {
    isStreaming,
    isStarting,
    stream,
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
  };
}

// Synthetic shutter sound using Web Audio API (zero external asset dependency)
function playShutterSound() {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Subtle click oscillator
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  } catch (e) {
    // Ignore audio errors if blocked
  }
}
