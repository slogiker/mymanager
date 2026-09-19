import React, { useState, useEffect } from 'react';
import { AtSign, Check, AlertTriangle, Save, User as UserIcon } from 'lucide-react';
import { User } from '../../types';
import { api } from '../../lib/api';

interface PersonalDetailsSectionProps {
  user: User;
  onUserUpdate: (u: User) => void;
}

export function PersonalDetailsSection({ user, onUserUpdate }: PersonalDetailsSectionProps) {
  // Username self-change form
  const [newUsername, setNewUsername] = useState(user.username || '');
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameSuccess, setUsernameSuccess] = useState('');
  const [usernameError, setUsernameError] = useState('');

  // Personal details form
  const [detailsForm, setDetailsForm] = useState({
    name: user.name || '',
    email: user.email || '',
  });
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsSuccess, setDetailsSuccess] = useState('');
  const [detailsError, setDetailsError] = useState('');

  useEffect(() => {
    setNewUsername(user.username || '');
    setDetailsForm({
      name: user.name || '',
      email: user.email || '',
    });
  }, [user]);

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameError('');
    setUsernameSuccess('');

    const clean = newUsername.trim().toLowerCase();
    if (clean.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(clean)) {
      setUsernameError('Username may only contain letters, numbers, underscores, and hyphens');
      return;
    }
    if (clean === user.username.toLowerCase()) {
      setUsernameSuccess(`Username is already set to @${clean}`);
      setTimeout(() => setUsernameSuccess(''), 3000);
      return;
    }

    setUsernameLoading(true);
    try {
      const res = await api.patch<{ message: string; username: string; user?: User }>('/auth/username', { username: clean });
      if (res.user) {
        onUserUpdate(res.user);
      } else {
        onUserUpdate({ ...user, username: clean });
      }
      setNewUsername(clean);
      setUsernameSuccess(`Username successfully updated to @${clean} (Session token refreshed)`);
      setTimeout(() => setUsernameSuccess(''), 4000);
    } catch (err: any) {
      setUsernameError(err.message || 'Failed to update username');
    } finally {
      setUsernameLoading(false);
    }
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setDetailsError('');
    setDetailsSuccess('');
    setDetailsLoading(true);

    try {
      const updated = await api.patch<User>('/auth/me', {
        name: detailsForm.name,
        email: detailsForm.email,
      });
      onUserUpdate(updated);
      setDetailsSuccess('Personal profile updated successfully!');
      setTimeout(() => setDetailsSuccess(''), 4000);
    } catch (err: any) {
      setDetailsError(err.message || 'Failed to update profile');
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Card 1: Account Handle / Username Self-Change */}
      <div className="rounded-2xl border border-slate-800/80 bg-[#16181f] p-6 sm:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <AtSign className="w-4 h-4 text-red-500" />
              Account Handle / Username
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Your unique login identifier across MyManager. Updating will immediately refresh your session.
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 w-fit">
            Current: <strong className="text-white">@{user.username}</strong>
          </span>
        </div>

        {usernameSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{usernameSuccess}</span>
          </div>
        )}
        {usernameError && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{usernameError}</span>
          </div>
        )}

        <form onSubmit={handleUpdateUsername} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              New Username <span className="text-red-500 font-bold">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">@</span>
              <input
                type="text"
                required
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="e.g. daniel"
                className="w-full pl-8 pr-3.5 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:border-red-500/60 transition-colors"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Must be 3–30 characters long and contain only letters, numbers, underscores, and hyphens.
            </p>
          </div>

          <button
            type="submit"
            disabled={usernameLoading || newUsername.trim().toLowerCase() === user.username.toLowerCase()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-[0_0_20px_-5px_rgba(239,68,68,0.5)] transition-all disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {usernameLoading ? 'Saving Username...' : 'Update Username'}
          </button>
        </form>
      </div>

      {/* Card 2: Personal Profile Details */}
      <div className="rounded-2xl border border-slate-800/80 bg-[#16181f] p-6 sm:p-8 space-y-5">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-red-500" />
            Personal Profile Details
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Update your display name and email address for system notifications.
          </p>
        </div>

        {detailsSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{detailsSuccess}</span>
          </div>
        )}
        {detailsError && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{detailsError}</span>
          </div>
        )}

        <form onSubmit={handleSaveDetails} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Full Display Name
            </label>
            <input
              type="text"
              value={detailsForm.name}
              onChange={(e) => setDetailsForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Daniel Pliberšek"
              className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-red-500/60 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={detailsForm.email}
              onChange={(e) => setDetailsForm(f => ({ ...f, email: e.target.value }))}
              placeholder="user@example.com"
              className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-red-500/60 transition-colors"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={detailsLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-[0_0_20px_-5px_rgba(239,68,68,0.5)] transition-all disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {detailsLoading ? 'Saving Profile...' : 'Save Profile Details'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
