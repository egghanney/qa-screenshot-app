'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, Info, X, Loader2 } from 'lucide-react';

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  itemHighlight?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemHighlight,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false
}: ConfirmationModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      iconBg: 'bg-rose-50 border-rose-200 text-rose-600',
      icon: <Trash2 className="w-5 h-5 text-rose-600" />,
      confirmBtn: 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs focus:ring-rose-500'
    },
    warning: {
      iconBg: 'bg-amber-50 border-amber-200 text-amber-600',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
      confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs focus:ring-amber-500'
    },
    info: {
      iconBg: 'bg-indigo-50 border-indigo-200 text-indigo-600',
      icon: <Info className="w-5 h-5 text-indigo-600" />,
      confirmBtn: 'bg-dark-chassis hover:bg-black text-white shadow-xs focus:ring-dark-chassis'
    }
  }[variant];

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-50"
      onClick={() => {
        if (!isLoading) onClose();
      }}
    >
      <div 
        className="bg-white rounded-[24px] border border-clinical-border shadow-2xl w-full max-w-md overflow-hidden text-dark-chassis animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 pb-2 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 ${variantStyles.iconBg}`}>
              {variantStyles.icon}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-dark-chassis tracking-tight">
                {title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-txt-muted hover:text-dark-chassis transition disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-5 sm:px-6 py-3 space-y-3 text-xs text-txt-muted leading-relaxed">
          <p>{message}</p>

          {itemHighlight && (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-clinical-border font-mono text-xs text-dark-chassis break-words">
              {itemHighlight}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-clinical-border flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-pill bg-white hover:bg-slate-100 text-dark-chassis text-xs font-semibold border border-clinical-border transition disabled:opacity-50"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-5 py-2 rounded-pill text-xs font-bold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 ${variantStyles.confirmBtn}`}
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
