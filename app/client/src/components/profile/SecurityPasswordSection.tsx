import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Check, AlertTriangle } from 'lucide-react';
import { api } from '../../lib/api';

export function SecurityPasswordSection() {
  const [pwdForm, setPwdForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdError, setPwdError] = useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (pwdForm.newPassword.length < 6) {
      setPwdError('New password must be at least 6 characters');
      return;
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdError('New passwords do not match');
      return;
    }

    setPwdLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword,
      });
      setPwdSuccess('Password changed successfully!');
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPwdSuccess(''), 4000);
    } catch (err: any) {
      setPwdError(err.message || 'Failed to change password');
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-[#16181f] p-6 sm:p-8 space-y-6">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-1">
          Change Password
        </h3>
        <p className="text-xs text-slate-500">
          Ensure your account is using a secure password of at least 6 characters.
        </p>
      </div>

      {pwdSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>{pwdSuccess}</span>
        </div>
      )}
      {pwdError && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{pwdError}</span>
        </div>
      )}

      <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Current Password <span className="text-red-500 font-bold">*</span>
          </label>
          <div className="relative">
            <input
              type={showCurrentPwd ? 'text' : 'password'}
              required
              value={pwdForm.currentPassword}
              onChange={(e) => setPwdForm(f => ({ ...f, currentPassword: e.target.value }))}
              className="w-full pl-3.5 pr-10 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-red-500/60 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPwd(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showCurrentPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            New Password <span className="text-red-500 font-bold">*</span>
          </label>
          <div className="relative">
            <input
              type={showNewPwd ? 'text' : 'password'}
              required
              minLength={6}
              value={pwdForm.newPassword}
              onChange={(e) => setPwdForm(f => ({ ...f, newPassword: e.target.value }))}
              placeholder="At least 6 characters"
              className="w-full pl-3.5 pr-10 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-red-500/60 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowNewPwd(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Confirm New Password <span className="text-red-500 font-bold">*</span>
          </label>
          <div className="relative">
            <input
              type={showConfirmPwd ? 'text' : 'password'}
              required
              value={pwdForm.confirmPassword}
              onChange={(e) => setPwdForm(f => ({ ...f, confirmPassword: e.target.value }))}
              className="w-full pl-3.5 pr-10 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-red-500/60 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPwd(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={pwdLoading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-[0_0_20px_-5px_rgba(239,68,68,0.5)] transition-all disabled:opacity-50"
          >
            <Lock className="w-3.5 h-3.5" />
            {pwdLoading ? 'Updating Password...' : 'Update Password'}
          </button>
        </div>
      </form>
    </div>
  );
}
