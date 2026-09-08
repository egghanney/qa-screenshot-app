'use client';

import React, { useState } from 'react';
import { 
  X, 
  Smartphone, 
  Globe, 
  Monitor, 
  Plus
} from 'lucide-react';
import { PlatformType, Project } from '@/lib/types';
import { supabase } from '@/lib/supabase/client';

interface CreateAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAppCreated: (project: Project) => void;
}

export function CreateAppModal({ isOpen, onClose, onAppCreated }: CreateAppModalProps) {
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState<PlatformType>('Android');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter an application name');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from('qa_projects')
        .insert({
          name: name.trim(),
          platform,
          description: description.trim() || null
        })
        .select('*')
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      if (data) {
        onAppCreated(data as Project);
        onClose();
        setName('');
        setDescription('');
        setPlatform('Android');
      }
    } catch (err: any) {
      console.error('Error creating app:', err);
      setError(err.message || 'Failed to create application');
    } finally {
      setIsSubmitting(false);
    }
  };

  const platforms: { type: PlatformType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { type: 'Android', label: 'Android Mobile', icon: Smartphone },
    { type: 'iOS', label: 'Apple iOS', icon: Smartphone },
    { type: 'Web', label: 'Web Application', icon: Globe },
    { type: 'Mobile Web', label: 'Mobile Web', icon: Monitor },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-chassis/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-qa-surface rounded-[28px] border border-qa-border shadow-modal max-w-md w-full p-6 space-y-5 text-txt-primary">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-qa-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-dark-chassis text-neon flex items-center justify-center font-bold text-xs">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-dark-chassis">Register New Application</h3>
              <p className="text-[11px] text-txt-secondary">Set up a testing workspace for your application</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-qa-warm hover:bg-qa-border text-txt-muted hover:text-dark-chassis flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-status-critical/10 border border-status-critical/30 rounded-xl text-xs text-status-critical">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-dark-chassis block">
              Application Name <span className="text-status-critical">*</span>
            </label>
            <input 
              type="text"
              required
              placeholder="e.g. MTN MoMo Mobile, Vendor Portal"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-qa-white border border-qa-border rounded-xl text-xs focus:outline-none focus:border-dark-chassis placeholder:text-txt-muted shadow-2xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-dark-chassis block">
              Primary Platform
            </label>
            <div className="grid grid-cols-2 gap-2">
              {platforms.map(p => {
                const Icon = p.icon;
                const isSelected = platform === p.type;
                return (
                  <button
                    key={p.type}
                    type="button"
                    onClick={() => setPlatform(p.type)}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 text-xs transition ${
                      isSelected 
                        ? 'bg-dark-chassis text-white border-dark-chassis font-semibold shadow-xs' 
                        : 'bg-qa-white text-txt-primary border-qa-border hover:bg-qa-warm'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-neon' : 'text-txt-muted'}`} />
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-dark-chassis block">
              Description <span className="text-txt-muted text-[10px] font-normal">(Optional)</span>
            </label>
            <textarea 
              rows={2}
              placeholder="Brief description of features, core users, or release version..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-qa-white border border-qa-border rounded-xl text-xs focus:outline-none focus:border-dark-chassis placeholder:text-txt-muted shadow-2xs resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-qa-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-pill text-xs border border-qa-border bg-qa-white text-dark-chassis hover:bg-qa-warm transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-4 py-1.5 rounded-pill text-xs font-bold bg-neon hover:bg-neon-bright text-dark-chassis transition shadow-card flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating App...' : 'Create Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
