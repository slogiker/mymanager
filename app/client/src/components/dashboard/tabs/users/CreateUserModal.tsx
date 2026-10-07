import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Modal, ErrBox } from '../../common/DashboardPrimitives';

export interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
  form: {
    username: string;
    name: string;
    email: string;
    role: string;
    passwordMode: 'auto' | 'custom';
    password?: string;
  };
  setForm: React.Dispatch<React.SetStateAction<{
    username: string;
    name: string;
    email: string;
    role: string;
    passwordMode: 'auto' | 'custom';
    password?: string;
  }>>;
  showCustomPwd: boolean;
  setShowCustomPwd: React.Dispatch<React.SetStateAction<boolean>>;
  submitting: boolean;
  modalError: string;
  onSubmit: (e: React.FormEvent) => void;
}

export function CreateUserModal({
  open,
  onClose,
  form,
  setForm,
  showCustomPwd,
  setShowCustomPwd,
  submitting,
  modalError,
  onSubmit,
}: CreateUserModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create User Account"
      footer={
        <>
          <button
            type="button"
            className="px-4 py-2 border border-slate-700/80 rounded-xl text-xs hover:bg-slate-800 text-slate-300"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-xs text-white font-medium disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Account'}
          </button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4 text-xs">
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
                value={form.password || ''}
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
  );
}
