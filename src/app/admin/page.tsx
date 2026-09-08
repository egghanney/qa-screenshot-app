'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/auth/AuthContext';
import { LoginView } from '@/components/auth/LoginView';
import { AdminGovernanceView } from '@/components/admin/AdminGovernanceView';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

function AdminPageContent() {
  const router = useRouter();
  const { user, profile, loading, isAdmin, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-chassis flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-dark-chassis text-neon flex items-center justify-center font-bold text-sm animate-spin border border-neon/30">
            QA
          </div>
          <span className="text-xs font-mono font-semibold text-neon tracking-wider">
            AUTHENTICATING QA TEST STUDIO...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-qa-bg flex items-center justify-center p-4">
        <div className="bg-qa-white p-8 rounded-[32px] border border-qa-border shadow-modal max-w-md text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-dark-chassis">Access Restricted</h2>
          <p className="text-xs text-txt-secondary leading-relaxed">
            The Admin Panel is reserved for designated administrators. Your account (<strong className="font-mono text-dark-chassis">{user.email}</strong>) has role <span className="uppercase font-bold font-mono">{profile?.role || 'tester'}</span>.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-2.5 rounded-pill bg-dark-chassis hover:bg-black text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Workspace</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <AdminGovernanceView
      onBack={() => router.push('/')}
      userEmail={user.email}
      userRole={profile?.role}
      onSignOut={signOut}
    />
  );
}

export default function AdminPage() {
  return (
    <AuthProvider>
      <AdminPageContent />
    </AuthProvider>
  );
}
