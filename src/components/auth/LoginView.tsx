'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, Eye, EyeOff, Sparkles } from 'lucide-react';

export function LoginView() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Setup mode detection (for uninitialized database only)
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);

  useEffect(() => {
    // Check if primary admin has been created
    const checkAdmin = async () => {
      try {
        const res = await fetch('/api/auth/setup-admin');
        const data = await res.json();
        if (data.success && !data.initialized) {
          setIsSetupMode(true);
          setEmail(data.adminEmail || 'egghanney@gmail.com');
        }
      } catch (err) {
        console.error('Failed to check admin status:', err);
      } finally {
        setCheckingSetup(false);
      }
    };
    checkAdmin();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);

    try {
      if (isSetupMode) {
        // Initialize Super Admin account
        const setupRes = await fetch('/api/auth/setup-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        });
        const setupData = await setupRes.json();

        if (!setupRes.ok || setupData.error) {
          setError(setupData.error || 'Failed to initialize administrator password.');
          setLoading(false);
          return;
        }

        // Now automatically sign in
        const res = await signIn('egghanney@gmail.com', password);
        if (!res.success) {
          setError(res.error || 'Password configured, but sign-in failed. Please sign in with your password.');
        }
      } else {
        // Standard Sign In
        const res = await signIn(email, password);
        if (!res.success) {
          setError(res.error || 'Invalid email or password.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-qa-bg flex items-center justify-center p-4">
      {/* Chassis Card */}
      <div className="w-full max-w-md bg-dark-chassis text-white rounded-[32px] p-8 sm:p-10 shadow-modal border border-dark-secondary/80 space-y-6 relative overflow-hidden">
        {/* Glow Accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-neon/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="space-y-2 text-center">
          <div className="w-12 h-12 rounded-full bg-neon text-dark-chassis font-bold text-sm flex items-center justify-center mx-auto shadow-sm shadow-neon/30">
            QA
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            QA <span className="text-neon">//</span> STUDIO
          </h1>
          <p className="text-xs text-txt-muted max-w-xs mx-auto">
            {isSetupMode 
              ? 'Welcome! Set up your primary administrator account to begin.' 
              : 'Sign in with your team credentials to access test suites and exploratory runs.'
            }
          </p>
        </div>

        {/* Setup Mode Notice */}
        {isSetupMode && !checkingSetup && (
          <div className="p-3 bg-neon/10 border border-neon/30 rounded-2xl flex items-start gap-2.5 text-xs text-neon">
            <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold block">First-Time Setup</span>
              <p className="text-[11px] text-txt-muted leading-relaxed">
                Designated Super Admin: <strong className="text-white">egghanney@gmail.com</strong>. Choose your administrator password to initialize QA Studio.
              </p>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-2xl flex items-start gap-2 text-xs text-rose-300 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Email Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-txt-muted uppercase tracking-wider block">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-txt-muted absolute left-3.5 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                disabled={isSetupMode}
                className={`w-full pl-10 pr-4 py-2.5 rounded-pill bg-dark-secondary text-white text-xs border border-dark-tertiary focus:outline-none focus:border-neon placeholder:text-txt-muted transition ${
                  isSetupMode ? 'opacity-80 cursor-not-allowed' : ''
                }`}
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-txt-muted uppercase tracking-wider block">
                Password
              </label>
              {isSetupMode && (
                <span className="text-[10px] text-txt-muted font-mono">Min. 6 characters</span>
              )}
            </div>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-txt-muted absolute left-3.5 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSetupMode ? 'Create new admin password' : '••••••••••••'}
                minLength={6}
                className="w-full pl-10 pr-10 py-2.5 rounded-pill bg-dark-secondary text-white text-xs border border-dark-tertiary focus:outline-none focus:border-neon placeholder:text-txt-muted transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 text-txt-muted hover:text-white absolute right-3"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || checkingSetup}
            className="w-full py-2.5 px-4 rounded-pill bg-neon hover:bg-neon-bright text-dark-chassis font-bold text-xs flex items-center justify-center gap-2 transition active:scale-98 shadow-sm shadow-neon/40 cursor-pointer disabled:opacity-60"
          >
            {loading ? (
              <span>{isSetupMode ? 'Initializing...' : 'Signing in...'}</span>
            ) : (
              <>
                <span>
                  {isSetupMode 
                    ? 'Initialize Administrator Account' 
                    : 'Sign In to Workspace'}
                </span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="pt-2 text-center text-[10px] text-txt-muted flex items-center justify-center gap-1.5 border-t border-dark-secondary">
          <ShieldCheck className="w-3 h-3 text-neon" />
          <span>Internal Team Access Only • Admin Provisioned</span>
        </div>
      </div>
    </div>
  );
}
