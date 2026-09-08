'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  ShieldCheck, 
  Settings, 
  LogOut, 
  ChevronDown, 
  User, 
  Shield
} from 'lucide-react';

interface ProfileMenuProps {
  userEmail?: string;
  userRole?: string;
  isAdmin?: boolean;
  onOpenAdminPanel?: () => void;
  onOpenSettings?: () => void;
  onSignOut?: () => void;
  align?: 'left' | 'right';
}

export function ProfileMenu({
  userEmail,
  userRole = 'tester',
  isAdmin = false,
  onOpenAdminPanel,
  onOpenSettings,
  onSignOut,
  align = 'right'
}: ProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!userEmail) return null;

  const initial = userEmail.charAt(0).toUpperCase();
  const displayName = userEmail.split('@')[0];
  const isSuperAdmin = userEmail.toLowerCase() === 'egghanney@gmail.com';

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 py-1 pl-1.5 pr-2.5 rounded-pill bg-dark-secondary hover:bg-dark-tertiary border transition cursor-pointer active:scale-95 ${
          isOpen ? 'border-neon ring-1 ring-neon/40 shadow-sm' : 'border-dark-tertiary'
        }`}
        title="Profile & Settings"
      >
        <div className="w-6 h-6 rounded-full bg-dark-chassis text-neon flex items-center justify-center font-bold text-xs border border-dark-tertiary shrink-0">
          {initial}
        </div>

        <div className="hidden xs:flex flex-col items-start text-left min-w-0">
          <span className="text-[11px] font-medium text-white max-w-[110px] sm:max-w-[140px] truncate leading-tight">
            {displayName}
          </span>
          <span className="text-[9px] font-mono text-txt-muted uppercase tracking-wider leading-none">
            {isSuperAdmin ? 'Super Admin' : userRole}
          </span>
        </div>

        <ChevronDown 
          className={`w-3.5 h-3.5 text-txt-muted transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-neon' : ''
          }`} 
        />
      </button>

      {/* Floating Dropdown Popover */}
      {isOpen && (
        <div
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} mt-2 w-64 rounded-2xl bg-dark-chassis border border-dark-secondary/90 shadow-modal text-white p-2 z-50 animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* User Details Header */}
          <div className="p-2.5 rounded-xl bg-dark-secondary/50 border border-dark-tertiary/50 mb-1.5 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-white truncate">{displayName}</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${
                isAdmin 
                  ? 'bg-neon/15 text-neon border border-neon/30' 
                  : 'bg-dark-chassis text-txt-muted border border-dark-tertiary'
              }`}>
                {isSuperAdmin ? 'Super Admin' : userRole}
              </span>
            </div>
            <div className="text-[11px] text-txt-muted font-mono truncate">{userEmail}</div>
          </div>

          {/* Menu Items */}
          <div className="space-y-0.5 text-xs">
            {/* Admin Panel Option */}
            {isAdmin && onOpenAdminPanel && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenAdminPanel();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-txt-secondary hover:text-white hover:bg-dark-secondary transition text-left cursor-pointer group"
              >
                <div className="w-6 h-6 rounded-lg bg-neon/10 text-neon flex items-center justify-center shrink-0 group-hover:bg-neon/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-white">Admin Panel</div>
                  <div className="text-[10px] text-txt-muted truncate">Team & user governance</div>
                </div>
              </button>
            )}

            {/* Settings Option */}
            {onOpenSettings && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenSettings();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-txt-secondary hover:text-white hover:bg-dark-secondary transition text-left cursor-pointer group"
              >
                <div className="w-6 h-6 rounded-lg bg-dark-tertiary text-txt-muted flex items-center justify-center shrink-0 group-hover:text-white">
                  <Settings className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-white">Settings</div>
                  <div className="text-[10px] text-txt-muted truncate">AI configuration & API keys</div>
                </div>
              </button>
            )}

            {/* Divider */}
            {onSignOut && (
              <div className="my-1 border-t border-dark-secondary/60" />
            )}

            {/* Sign Out Option */}
            {onSignOut && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onSignOut();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-txt-secondary hover:text-rose-400 hover:bg-rose-500/10 transition text-left cursor-pointer group"
              >
                <div className="w-6 h-6 rounded-lg bg-dark-tertiary text-txt-muted flex items-center justify-center shrink-0 group-hover:bg-rose-500/20 group-hover:text-rose-400">
                  <LogOut className="w-3.5 h-3.5" />
                </div>
                <span className="font-semibold">Sign Out</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
