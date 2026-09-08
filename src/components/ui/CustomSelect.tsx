'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
  group?: string;
  disabled?: boolean;
}

export interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  leadingIcon?: React.ReactNode;
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md';
  className?: string;
  buttonClassName?: string;
  mobileTitle?: string;
  disabled?: boolean;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  label,
  leadingIcon,
  variant = 'light',
  size = 'sm',
  className = '',
  buttonClassName = '',
  mobileTitle,
  disabled = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = useCallback((optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
    triggerRef.current?.focus();
  }, [onChange]);

  // Variant styling
  const isLight = variant === 'light';

  const triggerClasses = `
    inline-flex items-center justify-between gap-2 rounded-pill font-semibold transition-all cursor-pointer select-none outline-none
    ${size === 'sm' ? 'text-xs py-1.5 px-3' : 'text-sm py-2 px-4'}
    ${isLight 
      ? 'bg-qa-warm/90 hover:bg-qa-warm text-dark-chassis border border-qa-border shadow-2xs focus:border-dark-chassis active:scale-[0.98]' 
      : 'bg-dark-secondary hover:bg-dark-tertiary text-white border border-dark-tertiary focus:border-neon active:scale-[0.98]'
    }
    ${disabled ? 'opacity-50 pointer-events-none' : ''}
    ${buttonClassName}
  `;

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={label || placeholder}
        className={triggerClasses}
      >
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          {leadingIcon && (
            <span className={`shrink-0 ${isLight ? 'text-txt-muted' : 'text-txt-muted'}`}>
              {leadingIcon}
            </span>
          )}
          {label && (
            <span className={`text-[11px] font-semibold shrink-0 ${isLight ? 'text-txt-secondary' : 'text-txt-muted'}`}>
              {label}:
            </span>
          )}
          {selectedOption ? (
            <span className="truncate flex items-center gap-1.5 font-medium">
              {selectedOption.icon && <span className="shrink-0">{selectedOption.icon}</span>}
              <span className="truncate">{selectedOption.label}</span>
              {selectedOption.count !== undefined && (
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full shrink-0 ${
                  isLight ? 'bg-qa-white/80 text-txt-secondary border border-qa-border' : 'bg-dark-tertiary text-neon font-bold'
                }`}>
                  {selectedOption.count}
                </span>
              )}
            </span>
          ) : (
            <span className={`truncate font-normal ${isLight ? 'text-txt-muted' : 'text-txt-muted'}`}>
              {placeholder}
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          } ${isLight ? 'text-txt-muted' : 'text-txt-muted'}`}
        />
      </button>

      {/* DESKTOP POPOVER MENU (Hidden on mobile < 640px) */}
      {isOpen && (
        <div 
          role="listbox"
          className={`
            hidden sm:block absolute z-50 mt-1.5 left-0 min-w-[220px] w-max max-w-xs max-h-72 overflow-y-auto rounded-2xl border shadow-floating p-1.5 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150
            ${isLight 
              ? 'bg-qa-white/95 border-qa-border text-dark-chassis' 
              : 'bg-dark-secondary/95 border-dark-tertiary text-white shadow-black/40'
            }
          `}
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            const prevGroup = idx > 0 ? options[idx - 1].group : null;
            const showGroup = opt.group && opt.group !== prevGroup;

            return (
              <React.Fragment key={opt.value}>
                {showGroup && (
                  <div className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider select-none ${
                    isLight ? 'text-txt-muted bg-qa-warm/60 rounded-lg mt-1 mb-0.5' : 'text-txt-muted bg-dark-tertiary/60 rounded-lg mt-1 mb-0.5'
                  }`}>
                    {opt.group}
                  </div>
                )}
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={opt.disabled}
                  onClick={() => handleSelect(opt.value)}
                  className={`
                    w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer text-left
                    ${isSelected
                      ? isLight
                        ? 'bg-dark-chassis text-white font-bold'
                        : 'bg-neon text-dark-chassis font-bold'
                      : isLight
                        ? 'hover:bg-qa-warm text-dark-chassis'
                        : 'hover:bg-dark-tertiary text-txt-inverse'
                    }
                    ${opt.disabled ? 'opacity-40 pointer-events-none' : ''}
                  `}
                >
                  <div className="flex items-center gap-2 min-w-0 truncate">
                    {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                    <span className="truncate">{opt.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {opt.count !== undefined && (
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                        isSelected
                          ? isLight
                            ? 'bg-white/20 text-white'
                            : 'bg-dark-chassis/20 text-dark-chassis font-bold'
                          : isLight
                            ? 'bg-qa-warm text-txt-secondary'
                            : 'bg-dark-tertiary text-txt-muted'
                      }`}>
                        {opt.count}
                      </span>
                    )}
                    {isSelected && (
                      <Check className={`w-3.5 h-3.5 shrink-0 ${
                        isSelected && !isLight ? 'text-dark-chassis stroke-[2.5]' : ''
                      }`} />
                    )}
                  </div>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* MOBILE BOTTOM SHEET DRAWER (Shown on mobile < 640px) */}
      {isOpen && (
        <div className="sm:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-dark-black/60 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
            onClick={() => setIsOpen(false)}
          />

          {/* Bottom Sheet Card */}
          <div className={`
            relative z-10 w-full max-h-[80vh] flex flex-col rounded-t-[28px] border-t p-4 pb-8 shadow-modal animate-in slide-in-from-bottom duration-200
            ${isLight 
              ? 'bg-qa-white border-qa-border text-dark-chassis' 
              : 'bg-dark-chassis border-dark-tertiary text-white'
            }
          `}>
            {/* Sheet Handle */}
            <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-3 shrink-0" />

            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-qa-border/60">
              <div className="flex items-center gap-2">
                {leadingIcon && (
                  <span className={isLight ? 'text-txt-muted' : 'text-neon'}>
                    {leadingIcon}
                  </span>
                )}
                <span className="text-sm font-bold">
                  {mobileTitle || label || placeholder}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-dark-tertiary text-txt-muted transition"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sheet Options List */}
            <div className="overflow-y-auto space-y-1.5 divide-y divide-qa-border/30 max-h-[60vh] pr-1">
              {options.map((opt, idx) => {
                const isSelected = opt.value === value;
                const prevGroup = idx > 0 ? options[idx - 1].group : null;
                const showGroup = opt.group && opt.group !== prevGroup;

                return (
                  <React.Fragment key={opt.value}>
                    {showGroup && (
                      <div className={`px-4 py-1.5 text-[11px] font-mono font-bold uppercase tracking-wider select-none ${
                        isLight ? 'text-txt-muted bg-qa-warm/70 rounded-xl mt-2 mb-1' : 'text-txt-muted bg-dark-tertiary/70 rounded-xl mt-2 mb-1'
                      }`}>
                        {opt.group}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      disabled={opt.disabled}
                      className={`
                        w-full min-h-[44px] flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-xs font-semibold transition cursor-pointer text-left
                        ${isSelected
                          ? isLight
                            ? 'bg-dark-chassis text-white shadow-2xs font-bold'
                            : 'bg-neon text-dark-chassis shadow-2xs font-bold'
                          : isLight
                            ? 'hover:bg-qa-warm text-dark-chassis active:bg-qa-warm'
                            : 'hover:bg-dark-secondary text-txt-inverse active:bg-dark-secondary'
                        }
                        ${opt.disabled ? 'opacity-40 pointer-events-none' : ''}
                      `}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 truncate">
                        {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                        <span className="text-sm truncate">{opt.label}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {opt.count !== undefined && (
                          <span className={`text-xs font-mono px-2 py-0.5 rounded-full font-medium ${
                            isSelected
                              ? isLight
                                ? 'bg-white/20 text-white'
                                : 'bg-dark-chassis/20 text-dark-chassis font-bold'
                              : isLight
                                ? 'bg-qa-warm text-txt-secondary border border-qa-border'
                                : 'bg-dark-tertiary text-neon'
                          }`}>
                            {opt.count}
                          </span>
                        )}
                        {isSelected ? (
                          <Check className={`w-4 h-4 shrink-0 ${
                            isSelected && !isLight ? 'text-dark-chassis stroke-[2.5]' : ''
                          }`} />
                        ) : (
                          <div className="w-4 h-4" />
                        )}
                      </div>
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
