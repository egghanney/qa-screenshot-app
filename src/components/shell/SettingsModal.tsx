'use client';

import React, { useState, useEffect } from 'react';
import { X, Key, Database, Check, BrainCircuit, Shield } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('AETHER_GEMINI_API_KEY') || '';
      setApiKey(stored);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('AETHER_GEMINI_API_KEY', apiKey.trim());
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-black/70 backdrop-blur-sm">
      <div className="bg-clinical-surface rounded-[28px] border border-clinical-border shadow-modal max-w-md w-full p-6 space-y-5 text-txt-primary">
        
        <div className="flex items-center justify-between border-b border-clinical-border pb-3">
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
            className="w-full px-3 py-2 bg-clinical-white border border-clinical-border rounded-xl text-xs font-mono focus:outline-none focus:border-dark-chassis"
          />
          <p className="text-[11px] text-txt-secondary leading-relaxed">
            Leave blank to use the built-in deterministic evidence simulation engine, or enter your Gemini key to run live multimodal Gemini 2.0 Flash analysis.
          </p>
        </div>

        {/* Supabase Connection Details */}
        <div className="p-3 bg-clinical-warm rounded-2xl border border-clinical-border text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-dark-chassis flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-dark-chassis" />
              Supabase PostgreSQL
            </span>
            <span className="px-2 py-0.5 rounded-full bg-status-positive/20 text-dark-chassis text-[10px] font-bold border border-status-positive">
              Connected
            </span>
          </div>
          <p className="text-[11px] text-txt-muted font-mono truncate">
            https://uwigrkumdxeoshzlxpek.supabase.co
          </p>
          <p className="text-[10px] text-txt-secondary">
            Namespaced tables active: `qa_projects`, `qa_features`, `qa_screens`, `qa_journey_nodes`, `qa_knowledge_items`
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-clinical-border">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-pill text-xs border border-clinical-border bg-clinical-white text-dark-chassis"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-1.5 rounded-pill text-xs font-bold bg-dark-chassis text-neon flex items-center gap-1.5 shadow"
          >
            {saved ? <Check className="w-3.5 h-3.5 text-status-positive" /> : <BrainCircuit className="w-3.5 h-3.5" />}
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>

      </div>
    </div>
  );
}
