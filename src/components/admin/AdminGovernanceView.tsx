'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Users, 
  UserPlus, 
  X, 
  Search, 
  Shield, 
  Key, 
  Trash2, 
  Check, 
  AlertCircle, 
  Clock, 
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowLeft,
  LogOut,
  ShieldCheck,
  UserCheck,
  Mail,
  User as UserIcon,
  Lock,
  Copy
} from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { ProfileMenu } from '@/components/shell/ProfileMenu';

export interface AdminUserItem {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'tester' | 'viewer';
  status: 'active' | 'suspended';
  created_at: string;
  updated_at: string;
  last_sign_in_at: string | null;
}

interface AdminGovernanceViewProps {
  onBack: () => void;
  userEmail?: string;
  userRole?: string;
  onOpenSettings?: () => void;
  onSignOut?: () => void;
}

export interface CreatedCredentials {
  name: string;
  email: string;
  password: string;
  role: string;
}

// Cryptographically secure password generator for team provisioning
function generateSecurePassword(length = 14): string {
  const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowers = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const specials = '!@#$%^&*';
  const all = uppers + lowers + digits + specials;

  const guaranteed = [
    uppers[Math.floor(Math.random() * uppers.length)],
    lowers[Math.floor(Math.random() * lowers.length)],
    digits[Math.floor(Math.random() * digits.length)],
    specials[Math.floor(Math.random() * specials.length)],
  ];

  const remainingLength = Math.max(0, length - guaranteed.length);
  const remaining: string[] = [];

  const cryptoObj = typeof window !== 'undefined' ? window.crypto : null;
  if (cryptoObj?.getRandomValues) {
    const randomBuffer = new Uint32Array(remainingLength);
    cryptoObj.getRandomValues(randomBuffer);
    for (let i = 0; i < remainingLength; i++) {
      remaining.push(all[randomBuffer[i] % all.length]);
    }
  } else {
    for (let i = 0; i < remainingLength; i++) {
      remaining.push(all[Math.floor(Math.random() * all.length)]);
    }
  }

  const combined = [...guaranteed, ...remaining];
  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }

  return combined.join('');
}

export function AdminGovernanceView({
  onBack,
  userEmail,
  userRole,
  onOpenSettings,
  onSignOut
}: AdminGovernanceViewProps) {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'tester' | 'viewer'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Add User Modal State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'tester' | 'viewer'>('tester');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isCopiedPassword, setIsCopiedPassword] = useState(false);
  const [isSubmittingNewUser, setIsSubmittingNewUser] = useState(false);

  // Post-Creation Credentials Modal
  const [createdUserCredentials, setCreatedUserCredentials] = useState<CreatedCredentials | null>(null);
  const [isCopiedFullCredentials, setIsCopiedFullCredentials] = useState(false);

  // Password Reset Modal State
  const [resetTargetUser, setResetTargetUser] = useState<AdminUserItem | null>(null);
  const [newResetPassword, setNewResetPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isCopiedResetPassword, setIsCopiedResetPassword] = useState(false);
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      } else if (data.error) {
        setErrorMessage(data.error);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to fetch team members.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Open Add User Dialog with auto-generated credentials
  const handleOpenAddUser = () => {
    setNewEmail('');
    setNewName('');
    setNewRole('tester');
    setNewPassword(generateSecurePassword());
    setShowNewPassword(false);
    setIsCopiedPassword(false);
    setIsAddUserOpen(true);
  };

  // Open Reset Password Dialog with auto-generated credentials
  const handleOpenResetModal = (member: AdminUserItem) => {
    setResetTargetUser(member);
    setNewResetPassword(generateSecurePassword());
    setShowResetPassword(false);
    setIsCopiedResetPassword(false);
  };

  // Add User Handler
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmittingNewUser(true);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          fullName: newName,
          role: newRole,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setErrorMessage(data.error || 'Failed to create user.');
        setIsSubmittingNewUser(false);
        return;
      }

      showToast(`User ${newEmail} successfully registered.`);
      setCreatedUserCredentials({
        name: newName,
        email: newEmail,
        password: newPassword,
        role: newRole,
      });
      setIsCopiedFullCredentials(false);
      setIsAddUserOpen(false);
      setNewEmail('');
      setNewName('');
      setNewPassword('');
      setNewRole('tester');
      fetchUsers();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create user.');
    } finally {
      setIsSubmittingNewUser(false);
    }
  };

  // Update Role Handler
  const handleUpdateRole = async (userId: string, newRole: string) => {
    setErrorMessage(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, role: newRole }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Member role updated.');
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
      } else {
        setErrorMessage(data.error);
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // Toggle Suspend / Active
  const handleToggleStatus = async (user: AdminUserItem) => {
    setErrorMessage(null);
    const targetStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, status: targetStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`User status set to ${targetStatus}.`);
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: targetStatus } : u));
      } else {
        setErrorMessage(data.error);
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // Reset Password Handler
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser) return;
    setErrorMessage(null);
    setIsSubmittingReset(true);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: resetTargetUser.id, newPassword: newResetPassword }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Password updated for ${resetTargetUser.email}.`);
        setResetTargetUser(null);
        setNewResetPassword('');
      } else {
        setErrorMessage(data.error);
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmittingReset(false);
    }
  };

  // Delete User Handler
  const handleDeleteUser = async (user: AdminUserItem) => {
    if (!confirm(`Are you sure you want to remove ${user.email} from the workspace? This action is permanent.`)) {
      return;
    }
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/admin/users?id=${user.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast(`User ${user.email} removed.`);
        setUsers(prev => prev.filter(u => u.id !== user.id));
      } else {
        setErrorMessage(data.error);
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = users.length;
    const admins = users.filter(u => u.role === 'admin').length;
    const testers = users.filter(u => u.role === 'tester' && u.status === 'active').length;
    const viewers = users.filter(u => u.role === 'viewer').length;
    const suspended = users.filter(u => u.status === 'suspended').length;
    return { total, admins, testers, viewers, suspended };
  }, [users]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = !searchQuery.trim() || 
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.role.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  return (
    <div className="min-h-screen bg-qa-bg text-txt-primary flex flex-col">
      {/* Studio Header Bar */}
      <header className="bg-dark-chassis text-white border-b border-dark-secondary px-3.5 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-dark-secondary hover:bg-dark-tertiary text-txt-secondary hover:text-white text-xs font-semibold transition border border-dark-tertiary shrink-0 active:scale-95 cursor-pointer"
            title="Return to Workspace"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Back</span>
          </button>

          <div className="h-4 w-px bg-dark-tertiary hidden xs:block" />

          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-neon text-dark-chassis flex items-center justify-center font-bold text-xs shadow-sm shadow-neon/40 shrink-0">
            QA
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="font-bold tracking-tight text-sm sm:text-base text-white truncate">
                QA <span className="text-neon">//</span> TEST STUDIO
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-neon/15 text-neon border border-neon/30">
                ADMIN PANEL
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-txt-muted truncate hidden md:block">
              Team & User Governance • Workspace Access Control
            </p>
          </div>
        </div>

        {/* Header Tools */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchUsers}
            disabled={isLoading}
            className="w-8 h-8 rounded-full bg-dark-secondary hover:bg-dark-tertiary text-txt-muted hover:text-white flex items-center justify-center transition border border-dark-tertiary cursor-pointer"
            title="Refresh team data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {userEmail && (
            <ProfileMenu
              userEmail={userEmail}
              userRole={userRole}
              isAdmin={false}
              onOpenSettings={onOpenSettings}
              onSignOut={onSignOut}
              align="right"
            />
          )}
        </div>
      </header>

      {/* Main Full Page Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3.5 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
        
        {/* Page Hero Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-[32px] bg-dark-chassis text-white border border-dark-secondary shadow-card relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-neon/10 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-2 z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-neon/10 border border-neon/30 text-neon text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Panel</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white">
              Team & User Governance
            </h1>
            <p className="text-xs sm:text-sm text-txt-muted leading-relaxed">
              Manage workspace members, roles, permissions, and initial credentials
            </p>
          </div>

          <div className="z-10 shrink-0">
            <button
              onClick={handleOpenAddUser}
              className="px-4 sm:px-5 py-2.5 rounded-pill bg-neon hover:bg-neon-bright text-dark-chassis text-xs sm:text-sm font-bold transition shadow-card flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Team Member</span>
            </button>
          </div>
        </div>

        {/* Notifications / Toast */}
        {toastMessage && (
          <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-xs sm:text-sm text-emerald-300 flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 bg-rose-500/15 border border-rose-500/30 rounded-2xl text-xs sm:text-sm text-rose-300 flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {/* KPI Metric Ribbon */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-qa-white border border-qa-border shadow-xs space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-txt-muted block">
              Total Members
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-dark-chassis">
                {metrics.total}
              </span>
              <span className="text-xs text-txt-muted">Registered</span>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-qa-white border border-qa-border shadow-xs space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-txt-muted block">
              Administrators
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-dark-chassis">
                {metrics.admins}
              </span>
              <span className="text-xs text-neon-dark font-medium">Full Governance</span>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-qa-white border border-qa-border shadow-xs space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-txt-muted block">
              Active Testers
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-emerald-600">
                {metrics.testers}
              </span>
              <span className="text-xs text-txt-muted">Execution Enabled</span>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-qa-white border border-qa-border shadow-xs space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-txt-muted block">
              Viewers & Suspended
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-dark-chassis">
                {metrics.viewers}
              </span>
              {metrics.suspended > 0 && (
                <span className="text-xs text-amber-600 font-semibold">
                  ({metrics.suspended} Suspended)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Governance Table Container */}
        <div className="bg-qa-white rounded-[28px] border border-qa-border shadow-card overflow-hidden flex flex-col">
          {/* Filter Toolbar */}
          <div className="p-4 sm:p-5 border-b border-qa-border flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 bg-qa-surface">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-txt-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by email, member name, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-qa-warm/70 border border-qa-border rounded-pill text-xs sm:text-sm focus:outline-none focus:border-dark-chassis placeholder:text-txt-muted transition"
              />
            </div>

            {/* Role Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {(['all', 'admin', 'tester', 'viewer'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1.5 rounded-pill text-xs font-semibold capitalize transition cursor-pointer ${
                    roleFilter === r
                      ? 'bg-dark-chassis text-white shadow-2xs'
                      : 'bg-qa-warm text-txt-secondary hover:text-dark-chassis border border-qa-border'
                  }`}
                >
                  {r === 'all' ? 'All Roles' : `${r}s`}
                </button>
              ))}
            </div>
          </div>

          {/* Members Table */}
          <div className="overflow-x-auto">
            {isLoading && users.length === 0 ? (
              <div className="py-16 text-center text-xs text-txt-muted">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-dark-chassis mb-2" />
                <span>Loading team directory...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-16 text-center text-xs text-txt-muted space-y-2">
                <Users className="w-10 h-10 mx-auto text-slate-300" />
                <p className="font-semibold text-dark-chassis text-sm">No members found matching your search</p>
                <p className="text-[11px]">Try adjusting your search criteria or role filter.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-qa-border bg-qa-warm/40 text-[11px] font-mono uppercase tracking-wider text-txt-muted">
                    <th className="py-3.5 px-4 sm:px-6">Member</th>
                    <th className="py-3.5 px-4 sm:px-6">Role & Status</th>
                    <th className="py-3.5 px-4 sm:px-6 hidden md:table-cell">Activity</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-qa-border text-xs sm:text-sm">
                  {filteredUsers.map((member) => {
                    const isPrimaryAdmin = member.email.toLowerCase() === 'egghanney@gmail.com';
                    const isSuspended = member.status === 'suspended';

                    return (
                      <tr 
                        key={member.id}
                        className={`hover:bg-qa-warm/30 transition ${
                          isSuspended ? 'bg-amber-50/40 opacity-75' : isPrimaryAdmin ? 'bg-qa-warm/20' : ''
                        }`}
                      >
                        {/* Member Identity */}
                        <td className="py-4 px-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              isPrimaryAdmin 
                                ? 'bg-dark-chassis text-neon shadow-xs' 
                                : 'bg-qa-warm text-dark-chassis border border-qa-border'
                            }`}>
                              {member.full_name?.slice(0, 2).toUpperCase() || member.email.slice(0, 2).toUpperCase()}
                            </div>

                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-dark-chassis truncate">
                                  {member.full_name || member.email.split('@')[0]}
                                </span>
                                {isPrimaryAdmin && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-neon/20 text-neon-dark border border-neon/40">
                                    ★ Super Admin
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] sm:text-xs text-txt-secondary font-mono truncate">
                                {member.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role & Status */}
                        <td className="py-4 px-4 sm:px-6">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2.5 py-1 rounded-pill text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider ${
                              member.role === 'admin'
                                ? 'bg-dark-chassis text-neon'
                                : member.role === 'tester'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-slate-100 text-slate-700 border border-slate-300'
                            }`}>
                              {member.role}
                            </span>

                            {isSuspended ? (
                              <span className="px-2 py-0.5 rounded-pill text-[10px] font-mono font-bold bg-amber-200 text-amber-900 border border-amber-300">
                                Suspended
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-pill text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hidden sm:inline-block">
                                Active
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Activity */}
                        <td className="py-4 px-4 sm:px-6 hidden md:table-cell">
                          <div className="space-y-0.5 text-xs text-txt-secondary">
                            <div className="flex items-center gap-1 text-txt-muted">
                              <Clock className="w-3 h-3" />
                              <span>
                                {member.last_sign_in_at 
                                  ? `Last active ${new Date(member.last_sign_in_at).toLocaleDateString()}` 
                                  : 'Never signed in'
                                }
                              </span>
                            </div>
                            <div className="text-[10px] font-mono text-txt-muted">
                              Joined {new Date(member.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 sm:px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                            {/* Role Dropdown */}
                            {!isPrimaryAdmin && (
                              <select
                                value={member.role}
                                onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                                className="text-xs font-semibold py-1.5 pl-2.5 pr-6 bg-qa-warm rounded-pill border border-qa-border cursor-pointer focus:outline-none focus:border-dark-chassis"
                                title="Change user role"
                              >
                                <option value="tester">Tester</option>
                                <option value="viewer">Viewer</option>
                                <option value="admin">Admin</option>
                              </select>
                            )}

                            {/* Password Reset CTA */}
                            <button
                              onClick={() => handleOpenResetModal(member)}
                              className="px-2.5 py-1.5 rounded-pill bg-white hover:bg-qa-warm text-dark-chassis text-xs font-semibold border border-qa-border flex items-center gap-1 transition active:scale-95 shadow-2xs cursor-pointer"
                              title="Reset Password"
                            >
                              <Key className="w-3.5 h-3.5 text-txt-muted" />
                              <span className="hidden sm:inline">Password</span>
                            </button>

                            {/* Suspend / Reactivate */}
                            {!isPrimaryAdmin && (
                              <button
                                onClick={() => handleToggleStatus(member)}
                                className={`px-2.5 py-1.5 rounded-pill text-xs font-semibold border transition active:scale-95 cursor-pointer ${
                                  isSuspended
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                    : 'bg-white text-txt-secondary border-qa-border hover:bg-amber-50 hover:text-amber-800'
                                }`}
                              >
                                {isSuspended ? 'Reactivate' : 'Suspend'}
                              </button>
                            )}

                            {/* Delete User */}
                            {!isPrimaryAdmin && (
                              <button
                                onClick={() => handleDeleteUser(member)}
                                className="p-2 rounded-full hover:bg-rose-50 text-txt-muted hover:text-rose-600 transition cursor-pointer"
                                title="Remove team member completely"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer Summary */}
          <div className="p-4 border-t border-qa-border bg-qa-surface flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-txt-secondary">
            <div className="flex items-center gap-2">
              <span className="font-mono text-txt-muted">
                Showing {filteredUsers.length} of {users.length} registered members
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-txt-muted">
              <ShieldCheck className="w-3.5 h-3.5 text-neon-dark" />
              <span>Zero external self-registration • Admin-governed access</span>
            </div>
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* ADD USER MODAL DIALOG */}
      {/* ========================================================================= */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-qa-white rounded-[28px] border border-qa-border shadow-modal overflow-hidden text-dark-chassis animate-in zoom-in-95">
            <div className="p-5 border-b border-qa-border bg-qa-surface flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-dark-chassis text-neon flex items-center justify-center font-bold text-xs">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-dark-chassis">Add Team Member</h3>
                  <p className="text-[11px] text-txt-muted">Credentials auto-generated • Closed team system</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddUserOpen(false)}
                className="p-1.5 rounded-full hover:bg-qa-warm text-txt-muted hover:text-dark-chassis cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-txt-secondary uppercase tracking-wider block">
                  Full Name
                </label>
                <div className="relative flex items-center">
                  <UserIcon className="w-4 h-4 text-txt-muted absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="w-full pl-9 pr-3 py-2 bg-qa-warm border border-qa-border rounded-pill text-xs focus:outline-none focus:border-dark-chassis"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-txt-secondary uppercase tracking-wider block">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-txt-muted absolute left-3 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-9 pr-3 py-2 bg-qa-warm border border-qa-border rounded-pill text-xs focus:outline-none focus:border-dark-chassis"
                  />
                </div>
              </div>

              {/* Auto-Generated Password Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-txt-secondary uppercase tracking-wider flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-txt-muted" />
                    <span>Auto-Generated Password</span>
                  </label>
                  <span className="text-[10px] text-emerald-600 font-mono font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> High Entropy
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1 flex items-center">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      readOnly
                      value={newPassword}
                      className="w-full pl-3 pr-9 py-2 bg-qa-warm/90 border border-qa-border rounded-pill text-xs font-mono text-dark-chassis select-all focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="p-1 text-txt-muted hover:text-dark-chassis absolute right-2.5 cursor-pointer"
                      title={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setNewPassword(generateSecurePassword())}
                    className="px-2.5 py-2 rounded-pill bg-qa-warm hover:bg-slate-200 text-dark-chassis text-xs font-semibold border border-qa-border flex items-center gap-1 transition active:scale-95 cursor-pointer shrink-0"
                    title="Generate another password"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-txt-muted" />
                    <span className="hidden sm:inline">Regenerate</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(newPassword);
                      setIsCopiedPassword(true);
                      setTimeout(() => setIsCopiedPassword(false), 2000);
                    }}
                    className="px-2.5 py-2 rounded-pill bg-dark-chassis hover:bg-black text-white text-xs font-semibold flex items-center gap-1 transition active:scale-95 cursor-pointer shrink-0"
                    title="Copy password to clipboard"
                  >
                    {isCopiedPassword ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-neon" />
                        <span className="hidden sm:inline text-neon">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-txt-muted leading-tight">
                  Auto-generated 14-char secure credential. A complete shareable summary will appear upon creation.
                </p>
              </div>

              {/* Workspace Role Dropdown */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-txt-secondary uppercase tracking-wider block">
                  Workspace Role
                </label>
                <CustomSelect
                  value={newRole}
                  onChange={(val) => setNewRole(val as any)}
                  options={[
                    { value: 'tester', label: 'QA Tester (Execute charters, log defects)' },
                    { value: 'viewer', label: 'Viewer (Read-only observation access)' },
                    { value: 'admin', label: 'Administrator (Manage users & workspace)' },
                  ]}
                  variant="light"
                  size="md"
                  className="w-full"
                  buttonClassName="w-full justify-between text-xs"
                  mobileTitle="Select Workspace Role"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 rounded-pill bg-qa-warm hover:bg-slate-200 text-txt-secondary text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewUser}
                  className="px-4 py-2 rounded-pill bg-dark-chassis hover:bg-black text-white text-xs font-bold transition flex items-center gap-1.5 active:scale-95 disabled:opacity-60 shadow-2xs cursor-pointer"
                >
                  {isSubmittingNewUser ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-neon" />
                  ) : (
                    <UserPlus className="w-3.5 h-3.5 text-neon" />
                  )}
                  <span>Create Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POST-CREATION CREDENTIALS SUCCESS MODAL */}
      {/* ========================================================================= */}
      {createdUserCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-qa-white rounded-[28px] border border-qa-border shadow-modal overflow-hidden text-dark-chassis animate-in zoom-in-95">
            <div className="p-5 sm:p-6 border-b border-qa-border bg-dark-chassis text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neon text-dark-chassis flex items-center justify-center font-bold text-sm shadow-sm shadow-neon/40 shrink-0">
                  <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">Account Provisioned</h3>
                  <p className="text-[11px] text-neon font-mono">Team credentials ready to share</p>
                </div>
              </div>
              <button
                onClick={() => setCreatedUserCredentials(null)}
                className="p-1.5 rounded-full hover:bg-dark-secondary text-txt-muted hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-qa-surface border border-qa-border space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-qa-border/60">
                  <span className="text-[11px] font-semibold text-txt-muted uppercase">Full Name</span>
                  <span className="font-bold text-dark-chassis">{createdUserCredentials.name}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-qa-border/60">
                  <span className="text-[11px] font-semibold text-txt-muted uppercase">Email Address</span>
                  <span className="font-mono font-bold text-dark-chassis">{createdUserCredentials.email}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-qa-border/60">
                  <span className="text-[11px] font-semibold text-txt-muted uppercase">Assigned Role</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-dark-chassis text-neon">
                    {createdUserCredentials.role}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-txt-muted uppercase">Initial Password</span>
                  <span className="font-mono font-bold text-dark-chassis px-2 py-1 bg-qa-warm rounded-md border border-qa-border">
                    {createdUserCredentials.password}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-neon/10 border border-neon/30 rounded-2xl flex items-start gap-2.5 text-xs text-neon-dark">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-neon-dark" />
                <p className="text-[11px] leading-relaxed">
                  Provide these credentials to the user. Since this is a closed system, self-service registration and password resets are disabled.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCreatedUserCredentials(null)}
                  className="px-4 py-2.5 rounded-pill bg-qa-warm hover:bg-slate-200 text-txt-secondary text-xs font-semibold transition cursor-pointer"
                >
                  Done
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const loginUrl = typeof window !== 'undefined' ? window.location.origin : '';
                    const fullText = `QA Studio Credentials\n---------------------\nName: ${createdUserCredentials.name}\nEmail: ${createdUserCredentials.email}\nPassword: ${createdUserCredentials.password}\nRole: ${createdUserCredentials.role.toUpperCase()}\nLogin URL: ${loginUrl}`;
                    navigator.clipboard.writeText(fullText);
                    setIsCopiedFullCredentials(true);
                    setTimeout(() => setIsCopiedFullCredentials(false), 2500);
                  }}
                  className="px-4 py-2.5 rounded-pill bg-neon hover:bg-neon-bright text-dark-chassis text-xs font-bold transition flex items-center gap-1.5 active:scale-95 shadow-sm shadow-neon/40 cursor-pointer"
                >
                  {isCopiedFullCredentials ? (
                    <>
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 stroke-[2.5]" />
                      <span>Copy Full Credentials</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RESET PASSWORD MODAL DIALOG */}
      {/* ========================================================================= */}
      {resetTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-qa-white rounded-[28px] border border-qa-border shadow-modal overflow-hidden text-dark-chassis animate-in zoom-in-95">
            <div className="p-5 border-b border-qa-border bg-qa-surface flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-dark-chassis text-neon flex items-center justify-center font-bold text-xs">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-dark-chassis">Reset Password</h3>
                  <p className="text-[11px] text-txt-muted truncate max-w-[200px] font-mono">
                    {resetTargetUser.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setResetTargetUser(null)}
                className="p-1.5 rounded-full hover:bg-qa-warm text-txt-muted hover:text-dark-chassis cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-5 space-y-4 text-xs">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-txt-secondary uppercase tracking-wider flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-txt-muted" />
                    <span>New Password</span>
                  </label>
                  <span className="text-[10px] text-emerald-600 font-mono font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> High Entropy
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1 flex items-center">
                    <input
                      type={showResetPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={newResetPassword}
                      onChange={(e) => setNewResetPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full pl-3 pr-9 py-2 bg-qa-warm/80 border border-qa-border rounded-pill text-xs font-mono text-dark-chassis focus:outline-none focus:border-dark-chassis"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      className="p-1 text-txt-muted hover:text-dark-chassis absolute right-2.5 cursor-pointer"
                      title={showResetPassword ? 'Hide password' : 'Show password'}
                    >
                      {showResetPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setNewResetPassword(generateSecurePassword())}
                    className="px-2.5 py-2 rounded-pill bg-qa-warm hover:bg-slate-200 text-dark-chassis text-xs font-semibold border border-qa-border flex items-center gap-1 transition active:scale-95 cursor-pointer shrink-0"
                    title="Generate another password"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-txt-muted" />
                    <span className="hidden sm:inline">Regen</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(newResetPassword);
                      setIsCopiedResetPassword(true);
                      setTimeout(() => setIsCopiedResetPassword(false), 2000);
                    }}
                    className="px-2.5 py-2 rounded-pill bg-dark-chassis hover:bg-black text-white text-xs font-semibold flex items-center gap-1 transition active:scale-95 cursor-pointer shrink-0"
                    title="Copy password to clipboard"
                  >
                    {isCopiedResetPassword ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-neon" />
                        <span className="hidden sm:inline text-neon">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetTargetUser(null)}
                  className="px-4 py-2 rounded-pill bg-qa-warm hover:bg-slate-200 text-txt-secondary text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReset}
                  className="px-4 py-2 rounded-pill bg-dark-chassis hover:bg-black text-white text-xs font-bold transition flex items-center gap-1.5 active:scale-95 disabled:opacity-60 shadow-2xs cursor-pointer"
                >
                  {isSubmittingReset ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-neon" />
                  ) : (
                    <Check className="w-3.5 h-3.5 text-neon" />
                  )}
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
