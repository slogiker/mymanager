import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function ChangePasswordPage() {
  const { user, changePassword } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<{ currentPassword: string; newPassword: string; confirm: string }>({ currentPassword: '', newPassword: '', confirm: '' });
  const [showCurrentPwd, setShowCurrentPwd] = useState<boolean>(false);
  const [showNewPwd, setShowNewPwd] = useState<boolean>(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  if (!user) return <Navigate to="/login" replace />;
  if (!user.must_change_password) return <Navigate to={user.role === 'owner' ? '/dashboard' : '/'} replace />;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (form.newPassword !== form.confirm) return setError('Passwords do not match');
    if (form.newPassword.length < 6) return setError('Password must be at least 6 characters');
    setError('');
    setLoading(true);
    try {
      await changePassword(form.currentPassword, form.newPassword);
      navigate(user.role === 'owner' ? '/dashboard' : '/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 items-center justify-center mb-4">
            <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Set new password</h1>
          <p className="text-slate-500 text-sm mt-1">You must change your password before continuing</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Current (one-time) password</label>
              <div className="relative">
                <input
                  type={showCurrentPwd ? 'text' : 'password'}
                  className="input-field pr-10"
                  placeholder="••••••••"
                  value={form.currentPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, currentPassword: e.target.value }))}
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  tabIndex={-1}
                  aria-label={showCurrentPwd ? 'Hide password' : 'Show password'}
                >
                  {showCurrentPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">New password</label>
              <div className="relative">
                <input
                  type={showNewPwd ? 'text' : 'password'}
                  className="input-field pr-10"
                  placeholder="At least 6 characters"
                  value={form.newPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, newPassword: e.target.value }))}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  tabIndex={-1}
                  aria-label={showNewPwd ? 'Hide password' : 'Show password'}
                >
                  {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Confirm new password</label>
              <div className="relative">
                <input
                  type={showConfirmPwd ? 'text' : 'password'}
                  className="input-field pr-10"
                  placeholder="••••••••"
                  value={form.confirm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, confirm: e.target.value }))}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  tabIndex={-1}
                  aria-label={showConfirmPwd ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Set password & continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
