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
  MoreVertical,
  CheckCircle2
} from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';

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

interface AdminControlPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminControlPanelModal({ isOpen, onClose }: AdminControlPanelModalProps) {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Add User Form State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'tester' | 'viewer'>('tester');
  const [isSubmittingNewUser, setIsSubmittingNewUser] = useState(false);

  // Password Reset Modal State
  const [resetTargetUser, setResetTargetUser] = useState<AdminUserItem | null>(null);
  const [newResetPassword, setNewResetPassword] = useState('');
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
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen, fetchUsers]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
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
      } else {
        showToast(`User ${newEmail} added successfully.`);
        setIsAddUserOpen(false);
        setNewEmail('');
        setNewName('');
        setNewPassword('');
        setNewRole('tester');
        await fetchUsers();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred creating user.');
    } finally {
      setIsSubmittingNewUser(false);
    }
  };

  // Update Role
  const handleUpdateRole = async (userId: string, targetRole: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, role: targetRole }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Role updated successfully.');
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: targetRole as any } : u));
      } else {
        setErrorMessage(data.error);
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // Toggle Suspend / Active Status
  const handleToggleStatus = async (user: AdminUserItem) => {
    const nextStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`User status set to ${nextStatus}.`);
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: nextStatus } : u));
      } else {
        setErrorMessage(data.error);
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // Submit Password Reset
  const handleExecutePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser || !newResetPassword) return;

    setIsSubmittingReset(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: resetTargetUser.id,
          newPassword: newResetPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Password reset for ${resetTargetUser.email}.`);
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

  // Delete User
  const handleDeleteUser = async (user: AdminUserItem) => {
    if (!confirm(`Are you sure you want to completely remove ${user.email} from the workspace?`)) return;

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

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(u =>
      u.email.toLowerCase().includes(q) ||
      u.full_name?.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-dark-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-4xl max-h-[90vh] bg-qa-white rounded-3xl border border-qa-border shadow-modal flex flex-col overflow-hidden text-dark-chassis">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-qa-border bg-qa-surface flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-dark-chassis text-neon flex items-center justify-center font-bold text-xs shadow-xs">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-dark-chassis tracking-tight">
                Team & User Governance
              </h2>
              <p className="text-[11px] text-txt-secondary">
                Manage workspace members, roles, permissions, and initial credentials
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchUsers}
              disabled={isLoading}
              className="p-2 rounded-full hover:bg-qa-warm text-txt-muted hover:text-dark-chassis transition"
              title="Refresh member list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-qa-warm text-txt-muted hover:text-dark-chassis transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Toast / Notification Banner */}
        {toastMessage && (
          <div className="mx-4 mt-3 p-3 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-2xl text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mx-4 mt-3 p-3 bg-rose-100 text-rose-800 border border-rose-300 rounded-2xl text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {/* Toolbar: Search + Add Member */}
        <div className="p-4 border-b border-qa-border flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-txt-muted absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search members by email, name, role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-qa-warm/70 border border-qa-border rounded-pill text-xs focus:outline-none focus:border-dark-chassis placeholder:text-txt-muted transition"
            />
          </div>

          <button
            onClick={() => setIsAddUserOpen(true)}
            className="w-full sm:w-auto px-4 py-1.5 rounded-pill bg-dark-chassis hover:bg-black text-white text-xs font-bold transition flex items-center justify-center gap-2 active:scale-95 shadow-2xs"
          >
            <UserPlus className="w-3.5 h-3.5 text-neon" />
            <span>Add Team Member</span>
          </button>
        </div>

        {/* User List Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading && users.length === 0 ? (
            <div className="p-12 text-center text-xs text-txt-muted">
              Loading workspace team members...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-xs text-txt-muted space-y-2">
              <Users className="w-8 h-8 mx-auto text-slate-300" />
              <p className="font-semibold text-dark-chassis">No members found matching your search</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredUsers.map((member) => {
                const isPrimaryAdmin = member.email.toLowerCase() === 'egghanney@gmail.com';
                const isSuspended = member.status === 'suspended';

                return (
                  <div
                    key={member.id}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isSuspended
                        ? 'bg-amber-50/50 border-amber-200 opacity-75'
                        : isPrimaryAdmin
                          ? 'bg-qa-warm/50 border-dark-chassis/30 shadow-2xs'
                          : 'bg-white border-qa-border hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    {/* Left: User Details */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isPrimaryAdmin 
                          ? 'bg-dark-chassis text-neon shadow-xs' 
                          : 'bg-qa-warm text-dark-chassis border border-qa-border'
                      }`}>
                        {member.full_name?.slice(0, 2).toUpperCase() || member.email.slice(0, 2).toUpperCase()}
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-dark-chassis truncate">
                            {member.full_name || 'Member'}
                          </span>

                          {/* Role Badge */}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                            member.role === 'admin'
                              ? 'bg-dark-chassis text-neon'
                              : member.role === 'tester'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-slate-100 text-slate-700 border border-slate-300'
                          }`}>
                            {member.role}
                          </span>

                          {/* Status Badge */}
                          {isSuspended && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-200 text-amber-900">
                              Suspended
                            </span>
                          )}

                          {isPrimaryAdmin && (
                            <span className="text-[10px] font-mono text-neon-dark font-bold">
                              ★ Super Admin
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-txt-secondary truncate">
                          <span className="font-mono truncate">{member.email}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-[10px] text-txt-muted shrink-0">
                            <Clock className="w-3 h-3" />
                            {member.last_sign_in_at 
                              ? `Active ${new Date(member.last_sign_in_at).toLocaleDateString()}` 
                              : 'Never logged in'
                            }
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
                      {/* Role Selector (Disabled for primary admin) */}
                      {!isPrimaryAdmin && (
                        <div className="relative">
                          <select
                            value={member.role}
                            onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                            className="text-xs font-semibold py-1 pl-2.5 pr-6 bg-qa-warm rounded-pill border border-qa-border cursor-pointer focus:outline-none focus:border-dark-chassis"
                          >
                            <option value="tester">Tester</option>
                            <option value="viewer">Viewer</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                      )}

                      {/* Reset Password Button */}
                      <button
                        onClick={() => {
                          setResetTargetUser(member);
                          setNewResetPassword('');
                        }}
                        className="px-2.5 py-1 rounded-pill bg-white hover:bg-qa-warm text-dark-chassis text-xs font-semibold border border-qa-border flex items-center gap-1 transition active:scale-95"
                        title="Reset User Password"
                      >
                        <Key className="w-3 h-3 text-txt-muted" />
                        <span className="hidden sm:inline">Password</span>
                      </button>

                      {/* Suspend / Reactivate */}
                      {!isPrimaryAdmin && (
                        <button
                          onClick={() => handleToggleStatus(member)}
                          className={`px-2.5 py-1 rounded-pill text-xs font-semibold border transition active:scale-95 ${
                            isSuspended
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-white text-txt-secondary border-qa-border hover:bg-amber-50 hover:text-amber-800'
                          }`}
                        >
                          {isSuspended ? 'Reactivate' : 'Suspend'}
                        </button>
                      )}

                      {/* Delete */}
                      {!isPrimaryAdmin && (
                        <button
                          onClick={() => handleDeleteUser(member)}
                          className="p-1.5 rounded-full hover:bg-rose-50 text-txt-muted hover:text-rose-600 transition"
                          title="Remove user completely"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-qa-border bg-qa-surface flex items-center justify-between text-xs text-txt-secondary shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-txt-muted">
              Total Members: <strong>{users.length}</strong>
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-pill bg-qa-warm hover:bg-qa-muted text-dark-chassis font-semibold border border-qa-border transition"
          >
            Close
          </button>
        </div>
      </div>

      {/* SUB-MODAL 1: ADD NEW MEMBER */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-dark-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-qa-white rounded-3xl border border-qa-border shadow-modal p-6 space-y-4 text-dark-chassis">
            <div className="flex items-center justify-between border-b border-qa-border pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-dark-chassis" />
                <h3 className="font-bold text-sm">Add New Team Member</h3>
              </div>
              <button onClick={() => setIsAddUserOpen(false)} className="text-txt-muted hover:text-dark-chassis">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold block text-txt-secondary">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="colleague@company.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-qa-warm border border-qa-border text-xs focus:outline-none focus:border-dark-chassis"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold block text-txt-secondary">Full Name</label>
                <input
                  type="text"
                  placeholder="Jane Doe"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-qa-warm border border-qa-border text-xs focus:outline-none focus:border-dark-chassis"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold block text-txt-secondary">Initial Password *</label>
                <input
                  type="text"
                  required
                  minLength={6}
                  placeholder="Set initial password (min. 6 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-qa-warm border border-qa-border text-xs font-mono focus:outline-none focus:border-dark-chassis"
                />
                <span className="text-[10px] text-txt-muted block">
                  You can share this password with the colleague to log in.
                </span>
              </div>

              <div className="space-y-1">
                <label className="font-semibold block text-txt-secondary">Role Permission *</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-qa-warm border border-qa-border text-xs font-semibold focus:outline-none focus:border-dark-chassis"
                >
                  <option value="tester">QA Tester (Create apps, run charters, report defects)</option>
                  <option value="viewer">Viewer (Read-only review of flows & reports)</option>
                  <option value="admin">Admin (Full administrative & user management)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 rounded-pill bg-qa-warm text-dark-chassis font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewUser}
                  className="px-4 py-2 rounded-pill bg-dark-chassis text-white font-bold hover:bg-black transition active:scale-95 disabled:opacity-60"
                >
                  {isSubmittingNewUser ? 'Creating...' : 'Create Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL 2: RESET PASSWORD */}
      {resetTargetUser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-dark-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-qa-white rounded-3xl border border-qa-border shadow-modal p-6 space-y-4 text-dark-chassis">
            <div className="flex items-center justify-between border-b border-qa-border pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-dark-chassis" />
                <h3 className="font-bold text-sm">Reset Password</h3>
              </div>
              <button onClick={() => setResetTargetUser(null)} className="text-txt-muted hover:text-dark-chassis">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-txt-secondary leading-relaxed">
              Reset password for <strong className="text-dark-chassis">{resetTargetUser.email}</strong>:
            </p>

            <form onSubmit={handleExecutePasswordReset} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold block text-txt-secondary">New Password (min 6 chars)</label>
                <input
                  type="text"
                  required
                  minLength={6}
                  placeholder="Enter new password"
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-qa-warm border border-qa-border text-xs font-mono focus:outline-none focus:border-dark-chassis"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetTargetUser(null)}
                  className="px-4 py-2 rounded-pill bg-qa-warm text-dark-chassis font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReset}
                  className="px-4 py-2 rounded-pill bg-dark-chassis text-white font-bold hover:bg-black transition active:scale-95 disabled:opacity-60"
                >
                  {isSubmittingReset ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
