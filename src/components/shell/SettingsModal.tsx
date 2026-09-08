'use client';

import React, { useState, useEffect } from 'react';
import { X, Key, Check, BrainCircuit } from 'lucide-react';
import { getStoredGeminiApiKey, setStoredGeminiApiKey } from '@/lib/settings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setApiKey(getStoredGeminiApiKey());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    setStoredGeminiApiKey(apiKey);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-black/70 backdrop-blur-sm">
      <div className="bg-qa-surface rounded-[28px] border border-qa-border shadow-modal max-w-md w-full p-6 space-y-5 text-txt-primary">
        
        <div className="flex items-center justify-between border-b border-qa-border pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-neon flex items-center justify-center text-dark-chassis font-bold text-xs">
              OS
            </div>
            <h3 className="text-sm font-bold text-dark-chassis">AetherQA System Settings</h3>
          </div>
          <button onClick={onClose} className="text-txt-muted hover:text-dark-chassis">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Gemini API Key */}
        <div className="space-y-2 text-xs">
          <label className="font-bold text-dark-chassis flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-dark-chassis" />
            Google Gemini API Key (Multimodal Vision)
          </label>
          <input
            type="password"
            placeholder="AIzaSy..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full px-3 py-2 bg-qa-white border border-qa-border rounded-xl text-xs font-mono focus:outline-none focus:border-dark-chassis"
          />
          <p className="text-[11px] text-txt-secondary leading-relaxed">
            Leave blank to use the built-in deterministic evidence simulation engine, or enter your Gemini key to run live multimodal Gemini Flash analysis.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-qa-border">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-pill text-xs border border-qa-border bg-qa-white text-dark-chassis hover:bg-qa-warm transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-1.5 rounded-pill text-xs font-bold bg-dark-chassis text-neon flex items-center gap-1.5 shadow active:scale-95 transition"
          >
            {saved ? <Check className="w-3.5 h-3.5 text-status-positive" /> : <BrainCircuit className="w-3.5 h-3.5" />}
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>

      </div>
    </div>
  );
}
