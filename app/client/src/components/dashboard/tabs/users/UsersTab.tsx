import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users as UsersIcon,
  ShieldCheck,
  Sliders,
  Plus,
  CheckCircle2,
  Eye,
  EyeOff,
  Copy,
  Check,
  Key,
  Trash2,
} from 'lucide-react';
import { User } from '../../../../types';
import { api } from '../../../../lib/api';
import { Modal, ErrBox, Spinner } from '../../common/DashboardPrimitives';
import { ServicePermissionsGrid } from './ServicePermissionsGrid';
import { FeatureFlagsGrid } from './FeatureFlagsGrid';

export interface UsersTabProps {
  defaultSubTab?: 'accounts' | 'permissions' | 'features';
}

export function UsersTab({ defaultSubTab = 'accounts' }: UsersTabProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab');
  const initialSubTab = (currentTab === 'permissions' || currentTab === 'features') 
    ? currentTab 
    : defaultSubTab;
  const [subTab, setSubTab] = useState<'accounts' | 'permissions' | 'features'>(initialSubTab);

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [modal, setModal] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string>('');
  
  const [form, setForm] = useState({
    username: '',
    name: '',
    email: '',
    role: 'user',
    passwordMode: 'auto' as 'auto' | 'custom',
    password: '',
  });
  const [showCustomPwd, setShowCustomPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Credentials notification banner
  const [credentialsBanner, setCredentialsBanner] = useState<{
    username: string;
    password: string;
    wasGenerated: boolean;
    action: 'created' | 'reset';
  } | null>(null);
  const [showBannerPwd, setShowBannerPwd] = useState<boolean>(true);
  const [copiedField, setCopiedField] = useState<string>('');

  const load = async () => {
    setLoading(true);
    try {
      setUsers(await api.get<User[]>('/users'));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Synchronize when outer tab changes
  useEffect(() => {
    if (currentTab === 'permissions' || currentTab === 'features' || currentTab === 'users') {
      setSubTab(currentTab === 'permissions' ? 'permissions' : currentTab === 'features' ? 'features' : 'accounts');
    }
  }, [currentTab]);

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(''), 2500);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setModalError('');

    if (!form.username.trim()) {
      setModalError('Username is required');
      return;
    }

    if (form.passwordMode === 'custom' && form.password.trim().length < 6) {
      setModalError('Custom password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post<{ user: User; oneTimePassword: string; wasGenerated: boolean }>('/users', {
        username: form.username.trim(),
        name: form.name.trim() || undefined,
        email: form.email.trim() || undefined,
        role: form.role,
        password: form.passwordMode === 'custom' ? form.password.trim() : undefined,
      });

      setModal(false);
      setModalError('');
      setForm({ username: '', name: '', email: '', role: 'user', passwordMode: 'auto', password: '' });
      setShowBannerPwd(true);
      setCredentialsBanner({
        username: res.user.username,
        password: res.oneTimePassword,
        wasGenerated: res.wasGenerated,
        action: 'created',
      });
      load();
    } catch (e) {
      setModalError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetUserPassword = async (u: User) => {
    if (!confirm(`Reset password for "${u.username}"? A new temporary password will be generated.`)) return;
    try {
      const res = await api.post<{ oneTimePassword: string }>(`/users/${u.id}/reset-password`);
      setShowBannerPwd(true);
      setCredentialsBanner({
        username: u.username,
        password: res.oneTimePassword,
        wasGenerated: true,
        action: 'reset',
      });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const remove = async (u: User) => {
    if (u.role === 'owner') {
      alert('Cannot delete the primary owner account');
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete user "${u.username}"?`)) return;
    try {
      await api.delete(`/users/${u.id}`);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3 overflow-x-auto">
        <button
          onClick={() => { setSubTab('accounts'); setSearchParams({ tab: 'users' }); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            subTab === 'accounts'
              ? 'bg-red-600 text-white shadow-[0_0_20px_-4px_rgba(239,68,68,0.5)]'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <UsersIcon className="w-4 h-4" />
          User Accounts
        </button>
        <button
          onClick={() => { setSubTab('permissions'); setSearchParams({ tab: 'permissions' }); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            subTab === 'permissions'
              ? 'bg-red-600 text-white shadow-[0_0_20px_-4px_rgba(239,68,68,0.5)]'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Service Permissions Grid
        </button>
        <button
          onClick={() => { setSubTab('features'); setSearchParams({ tab: 'features' }); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            subTab === 'features'
              ? 'bg-red-600 text-white shadow-[0_0_20px_-4px_rgba(239,68,68,0.5)]'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Feature Flags UI
        </button>
      </div>

      {subTab === 'permissions' && <ServicePermissionsGrid />}
      {subTab === 'features' && <FeatureFlagsGrid />}
      {subTab === 'accounts' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">User Management ({users.length})</h2>
              <p className="text-xs text-slate-500 mt-0.5">Manage registered accounts, grant roles, and issue password resets.</p>
            </div>
            <button
              onClick={() => {
                setError('');
                setModalError('');
                setForm({ username: '', name: '', email: '', role: 'user', passwordMode: 'auto', password: '' });
                setModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-[0_0_20px_-5px_rgba(239,68,68,0.4)] transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Create User
            </button>
          </div>

          <ErrBox msg={error} />

          {/* Prominent Credentials Banner */}
          {credentialsBanner && (
            <div className="p-4 rounded-2xl border border-emerald-500/40 bg-emerald-950/20 backdrop-blur-md shadow-lg space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    User {credentialsBanner.action === 'created' ? 'Created' : 'Password Reset'} Successfully!
                  </span>
                </div>
                <button
                  onClick={() => setCredentialsBanner(null)}
                  className="text-slate-400 hover:text-white text-xs font-semibold px-2 py-0.5 rounded hover:bg-white/10"
                >
                  Dismiss
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-emerald-500/20 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Username</span>
                  <span className="text-white font-bold">{credentialsBanner.username}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">
                    {credentialsBanner.wasGenerated ? 'Temporary Password (OTP)' : 'Custom Password'}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-emerald-300 font-bold tracking-wider font-mono">
                      {showBannerPwd ? credentialsBanner.password : '••••••••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowBannerPwd(v => !v)}
                      className="p-1 text-slate-400 hover:text-white bg-slate-800 rounded transition-colors"
                      title={showBannerPwd ? 'Hide Password' : 'Show Password'}
                      aria-label={showBannerPwd ? 'Hide Password' : 'Show Password'}
                    >
                      {showBannerPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyText(credentialsBanner.password, 'password')}
                      className="p-1 text-slate-400 hover:text-white bg-slate-800 rounded transition-colors"
                      title="Copy Password"
                    >
                      {copiedField === 'password' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                <span>
                  {credentialsBanner.wasGenerated
                    ? '⚠️ The user will be required to choose a new password upon first login.'
                    : '✓ The user can log in immediately with this password.'}
                </span>
                <button
                  type="button"
                  onClick={() => copyText(`${window.location.origin}/login\nUsername: ${credentialsBanner.username}\nPassword: ${credentialsBanner.password}`, 'all')}
                  className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg font-sans font-medium transition-colors inline-flex items-center gap-1.5"
                >
                  {copiedField === 'all' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedField === 'all' ? 'Copied with Login Link!' : 'Copy Credentials'}
                </button>
              </div>
            </div>
          )}

          {loading ? <Spinner /> : (
            <div className="rounded-xl border border-slate-800 bg-[#16181f] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/60 border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400">
                  <tr>
                    <th className="p-3">Username</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-white/[0.01]">
                      <td className="p-3 font-mono font-medium text-slate-200">
                        @{u.username}
                      </td>
                      <td className="p-3 text-slate-400">{u.name || '-'}</td>
                      <td className="p-3 font-mono text-slate-400">{u.email || '-'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                          u.role === 'owner' 
                            ? 'bg-red-950/40 text-red-400 border-red-500/40 font-bold'
                            : 'bg-slate-800 text-slate-300 border-slate-700/60'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3">
                        {u.must_change_password ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950/40 text-amber-400 border border-amber-500/30">
                            Must Change Pwd
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/30 text-emerald-400 border border-emerald-500/20">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          onClick={() => resetUserPassword(u)}
                          className="p-1 text-slate-500 hover:text-amber-400 transition-colors"
                          title={`Reset password for @${u.username}`}
                        >
                          <Key className="w-3.5 h-3.5 inline" />
                        </button>
                        {u.role !== 'owner' && (
                          <button
                            onClick={() => remove(u)}
                            className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                            title={`Delete @${u.username}`}
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Create User Modal */}
          <Modal
            open={modal}
            onClose={() => { setModal(false); setModalError(''); }}
            title="Create User"
            footer={
              <>
                <button
                  onClick={() => { setModal(false); setModalError(''); }}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={submit}
                  disabled={submitting}
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-[0_0_15px_-3px_rgba(239,68,68,0.5)] transition-all disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create User'}
                </button>
              </>
            }
          >
            <form onSubmit={submit} className="space-y-4 text-xs">
              <ErrBox msg={modalError} />

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-[11px] leading-relaxed">
                Only <strong className="text-white">Username</strong> is required. Name and email can be left blank to default to the username handle.
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Username <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                  required
                  placeholder="e.g. johndoe"
                  value={form.username}
                  onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Full Name <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <input
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                  placeholder="e.g. John Doe (defaults to username)"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Email Address <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                  placeholder="e.g. john@local.lan (defaults to username@local.lan)"
                  value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Role
                </label>
                <select
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                  value={form.role}
                  onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}
                >
                  <option value="user">User (Standard Access)</option>
                  <option value="owner">Owner (Full Admin Access)</option>
                </select>
              </div>

              {/* Password Options */}
              <div className="pt-2 border-t border-slate-800/80 space-y-3">
                <label className="block text-xs font-medium text-slate-300">
                  Password Provisioning
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, passwordMode: 'auto' }))}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      form.passwordMode === 'auto'
                        ? 'bg-red-600/10 border-red-500/50 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-semibold text-[11px]">Auto-Generate OTP</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Secure one-time temporary password</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, passwordMode: 'custom' }))}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      form.passwordMode === 'custom'
                        ? 'bg-red-600/10 border-red-500/50 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-semibold text-[11px]">Set Custom Password</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Define password right now</div>
                  </button>
                </div>

                {form.passwordMode === 'custom' ? (
                  <div className="relative pt-1">
                    <input
                      type={showCustomPwd ? 'text' : 'password'}
                      className="w-full pl-3 pr-9 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                      placeholder="Enter password (minimum 6 characters)"
                      value={form.password}
                      onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCustomPwd(v => !v)}
                      className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                    >
                      {showCustomPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    A 12-character secure password will be generated and displayed upon creation. The user will be required to change it on their first login.
                  </p>
                )}
              </div>
            </form>
          </Modal>
        </div>
      )}
    </div>
  );
}
