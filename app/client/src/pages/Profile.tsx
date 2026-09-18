import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  User as UserIcon, 
  Lock, 
  Sliders, 
  AlertTriangle, 
  Check, 
  Shield, 
  Save, 
  Eye, 
  EyeOff, 
  Trash2, 
  LayoutGrid,
  CheckCircle2,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import type { User, Service } from '../types';
import { getUserPreferences, saveUserPreferences, UserPreferences } from '../lib/userPreferences';

export default function ProfilePage() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();

  // Navigation tab within Profile
  const [activeTab, setActiveTab] = useState<'details' | 'security' | 'preferences' | 'danger'>('details');

  // Personal details form
  const [detailsForm, setDetailsForm] = useState({
    name: user?.name || '',
    username: user?.username || '',
    email: user?.email || '',
  });
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsSuccess, setDetailsSuccess] = useState('');
  const [detailsError, setDetailsError] = useState('');

  // Password form
  const [pwdForm, setPwdForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdError, setPwdError] = useState('');

  // Card & Dashboard Preferences
  const [prefs, setPrefs] = useState<UserPreferences>(() => getUserPreferences(user?.id));
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [prefsSavedMessage, setPrefsSavedMessage] = useState(false);

  // Danger Zone / Delete Account Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmUsername, setConfirmUsername] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Sync details form if user loads or updates
  useEffect(() => {
    if (user) {
      setDetailsForm({
        name: user.name || '',
        username: user.username || '',
        email: user.email || '',
      });
      setPrefs(getUserPreferences(user.id));
    }
  }, [user]);

  // Load available services & categories for preference toggles
  useEffect(() => {
    api.get<Service[]>('/services')
      .then((data) => {
        setServices(data);
        const cats = Array.from(new Set(data.map(s => s.category?.trim() || 'Services'))).filter(Boolean);
        setAllCategories(cats);
      })
      .catch(() => {
        // Fallback common categories if services fetch is restricted
        setAllCategories(['Management', 'Network', 'System', 'Dev', 'Gaming', 'IOT']);
      });
  }, []);

  // Update Personal Details
  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setDetailsError('');
    setDetailsSuccess('');
    setDetailsLoading(true);

    try {
      const updated = await api.patch<User>('/auth/me', detailsForm);
      setUser(updated);
      setDetailsSuccess('Profile updated successfully!');
      setTimeout(() => setDetailsSuccess(''), 4000);
    } catch (err: any) {
      setDetailsError(err.message || 'Failed to update profile');
    } finally {
      setDetailsLoading(false);
    }
  };

  // Change Password
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

  // Toggle category visibility
  const toggleCategoryVisibility = (cat: string) => {
    const isHidden = prefs.hiddenCategories.includes(cat);
    const updated = isHidden
      ? prefs.hiddenCategories.filter(c => c !== cat)
      : [...prefs.hiddenCategories, cat];
    
    const newPrefs = { ...prefs, hiddenCategories: updated };
    setPrefs(newPrefs);
    saveUserPreferences(user?.id, newPrefs);
    flashPrefsNotice();
  };

  // Toggle gauge visibility
  const toggleGaugeVisibility = (gaugeKey: string) => {
    const isHidden = prefs.hiddenGauges.includes(gaugeKey);
    const updated = isHidden
      ? prefs.hiddenGauges.filter(g => g !== gaugeKey)
      : [...prefs.hiddenGauges, gaugeKey];

    const newPrefs = { ...prefs, hiddenGauges: updated };
    setPrefs(newPrefs);
    saveUserPreferences(user?.id, newPrefs);
    flashPrefsNotice();
  };

  // Reset preferences
  const resetPreferences = () => {
    const defaultPrefs: UserPreferences = {
      hiddenCategories: [],
      hiddenServices: [],
      hiddenGauges: [],
      compactMode: false,
    };
    setPrefs(defaultPrefs);
    saveUserPreferences(user?.id, defaultPrefs);
    flashPrefsNotice();
  };

  const flashPrefsNotice = () => {
    setPrefsSavedMessage(true);
    setTimeout(() => setPrefsSavedMessage(false), 2500);
  };

  // Delete Account
  const handleDeleteAccount = async () => {
    if (confirmUsername.trim().toLowerCase() !== (user?.username || '').toLowerCase()) {
      setDeleteError('Please type your exact username to confirm');
      return;
    }

    setDeleteLoading(true);
    setDeleteError('');
    try {
      await api.delete('/auth/me');
      await logout();
      navigate('/');
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete account');
      setDeleteLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#111216] text-slate-200">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-24 pb-20">
        {/* Page Title & Breadcrumb */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mb-1">
              <Link to="/" className="hover:text-slate-300 transition-colors">Home</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              {user.role === 'owner' && (
                <>
                  <Link to="/dashboard" className="hover:text-slate-300 transition-colors">Dashboard</Link>
                  <ChevronRight className="w-3.5 h-3.5" />
                </>
              )}
              <span className="text-red-400">Account Settings</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              User Profile & Settings
            </h1>
          </div>

          {user.role === 'owner' && (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 hover:text-white rounded-xl transition-all"
            >
              <LayoutGrid className="w-4 h-4 text-red-500" />
              Back to Dashboard
            </Link>
          )}
        </div>

        {/* User Summary Card */}
        <div className="mb-8 p-6 rounded-2xl border border-slate-800/80 bg-[#16181f]/80 backdrop-blur-md flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center text-white font-bold text-2xl shadow-[0_0_25px_-5px_rgba(239,68,68,0.5)] flex-shrink-0">
            {user.username.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
              <h2 className="text-lg font-bold text-white">{user.name || user.username}</h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold tracking-wider bg-slate-800 text-slate-300 border border-slate-700/80 w-fit mx-auto sm:mx-0">
                <Shield className="w-3 h-3 text-red-500" />
                {user.role}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">@{user.username} · {user.email || 'No email configured'}</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Member since {new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Settings Navigation Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-slate-800/80 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'details'
                ? 'bg-red-600 text-white shadow-[0_0_20px_-4px_rgba(239,68,68,0.5)]'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            Personal Details
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'security'
                ? 'bg-red-600 text-white shadow-[0_0_20px_-4px_rgba(239,68,68,0.5)]'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Lock className="w-4 h-4" />
            Security & Password
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'preferences'
                ? 'bg-red-600 text-white shadow-[0_0_20px_-4px_rgba(239,68,68,0.5)]'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Dashboard Cards & Visibility
          </button>
          <button
            onClick={() => setActiveTab('danger')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'danger'
                ? 'bg-red-950/80 text-red-400 border border-red-500/40'
                : 'text-slate-400 hover:text-red-400 hover:bg-red-500/[0.04]'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-red-500" />
            Danger Zone
          </button>
        </div>

        {/* Tab 1: Personal Details */}
        {activeTab === 'details' && (
          <div className="rounded-2xl border border-slate-800/80 bg-[#16181f] p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-1">
                Edit Personal Information
              </h3>
              <p className="text-xs text-slate-500">
                Update your public name, unique handle username, and primary email address.
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
                  Username <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={detailsForm.username}
                  onChange={(e) => setDetailsForm(f => ({ ...f, username: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-red-500/60 transition-colors"
                />
                <p className="text-[11px] text-slate-500 mt-1">Used to log in to MyManager.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Full Name
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
                  {detailsLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: Security & Password */}
        {activeTab === 'security' && (
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
                <input
                  type={showNewPwd ? 'text' : 'password'}
                  required
                  value={pwdForm.confirmPassword}
                  onChange={(e) => setPwdForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-red-500/60 transition-colors"
                />
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
        )}

        {/* Tab 3: Dashboard Cards & Visibility Preferences */}
        {activeTab === 'preferences' && (
          <div className="rounded-2xl border border-slate-800/80 bg-[#16181f] p-6 sm:p-8 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Customize Dashboard View
                </h3>
                <p className="text-xs text-slate-500">
                  Select which service categories and system widgets you want to see on your dashboard.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {prefsSavedMessage && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1 animate-fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Saved!
                  </span>
                )}
                <button
                  onClick={resetPreferences}
                  className="px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 text-[11px] font-mono text-slate-400 hover:text-white transition-colors"
                >
                  Reset Defaults
                </button>
              </div>
            </div>

            {/* Service Categories Visibility */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                Visible Service Categories
              </h4>
              <p className="text-xs text-slate-500">
                Toggle categories on or off to tailor your dashboard columns:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                {allCategories.map((cat) => {
                  const isHidden = prefs.hiddenCategories.includes(cat);
                  const count = services.filter(s => (s.category?.trim() || 'Services') === cat).length;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategoryVisibility(cat)}
                      className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                        !isHidden
                          ? 'bg-slate-900/90 border-slate-700/80 text-white'
                          : 'bg-slate-950/40 border-slate-800/50 text-slate-500 opacity-60'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-xs">{cat}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {count} {count === 1 ? 'service' : 'services'}
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                        !isHidden ? 'bg-red-600 border-red-500 text-white' : 'border-slate-700 bg-slate-800/50'
                      }`}>
                        {!isHidden && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* System Gauge Widgets */}
            <div className="space-y-3 pt-4 border-t border-slate-800/60">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                System Status Gauges
              </h4>
              <p className="text-xs text-slate-500">
                Choose which status indicators appear in the top banner:
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                {[
                  { id: 'cpu', label: 'CPU Load' },
                  { id: 'memory', label: 'RAM / Memory' },
                  { id: 'disk', label: 'Disk Storage' },
                  { id: 'temperature', label: 'Temperature' },
                ].map((gauge) => {
                  const isHidden = prefs.hiddenGauges.includes(gauge.id);
                  return (
                    <button
                      key={gauge.id}
                      type="button"
                      onClick={() => toggleGaugeVisibility(gauge.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                        !isHidden
                          ? 'bg-slate-900/90 border-slate-700/80 text-white'
                          : 'bg-slate-950/40 border-slate-800/50 text-slate-500 opacity-60'
                      }`}
                    >
                      <span className="text-xs font-medium">{gauge.label}</span>
                      <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                        !isHidden ? 'bg-red-600 border-red-500 text-white' : 'border-slate-700 bg-slate-800/50'
                      }`}>
                        {!isHidden && <Check className="w-3 h-3 stroke-[2.5]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Danger Zone */}
        {activeTab === 'danger' && (
          <div className="rounded-2xl border border-red-500/30 bg-red-950/10 p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-red-400 flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4" />
                Danger Zone
              </h3>
              <p className="text-xs text-slate-400">
                Irreversible actions related to your account.
              </p>
            </div>

            {user.role === 'owner' ? (
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 space-y-2">
                <div className="font-semibold text-slate-200 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-red-500" />
                  Primary Owner Account Protected
                </div>
                <p>
                  As the primary system owner, your account cannot be deleted to prevent locking yourself out of the infrastructure and admin dashboard.
                </p>
              </div>
            ) : (
              <div className="p-5 rounded-xl border border-red-500/20 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-200 mb-1">Delete Account</h4>
                  <p className="text-xs text-slate-400 max-w-md">
                    Permanently delete your account, saved preferences, and credentials. This action cannot be undone.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmUsername('');
                    setDeleteError('');
                    setDeleteModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/40 text-xs font-semibold transition-all whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5 inline mr-1.5" />
                  Delete My Account
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Delete Account Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-red-500/40 bg-[#16181f] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-red-400 font-bold text-base">
              <AlertTriangle className="w-5 h-5" />
              Delete Account Confirmation
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This will permanently delete your account <span className="font-mono font-bold text-white">@{user.username}</span> and log you out.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-400">
                To confirm, type your username <span className="font-mono text-red-400 font-bold">{user.username}</span> below:
              </label>
              <input
                type="text"
                value={confirmUsername}
                onChange={(e) => setConfirmUsername(e.target.value)}
                placeholder={user.username}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-red-500 rounded-xl text-xs text-white font-mono"
              />
            </div>

            {deleteError && (
              <p className="text-xs text-red-400">{deleteError}</p>
            )}

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading || confirmUsername.trim().toLowerCase() !== user.username.toLowerCase()}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-[0_0_15px_-3px_rgba(239,68,68,0.5)] transition-all"
              >
                {deleteLoading ? 'Deleting...' : 'Confirm Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
