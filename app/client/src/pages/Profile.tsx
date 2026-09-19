import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  User as UserIcon, 
  Lock, 
  Sliders, 
  AlertTriangle, 
  Shield, 
  LayoutGrid,
  ChevronRight,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import type { Service } from '../types';
import { getUserPreferences, saveUserPreferences, UserPreferences } from '../lib/userPreferences';
import {
  PersonalDetailsSection,
  SecurityPasswordSection,
  NetworkDiagnosticsSection,
  DashboardPreferencesSection,
  DangerZoneSection,
  VpnStatusResponse,
} from '../components/profile';

export default function ProfilePage() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();

  // Navigation tab within Profile
  const [activeTab, setActiveTab] = useState<'details' | 'security' | 'network' | 'preferences' | 'danger'>('details');

  // Network & VPN Status
  const [vpnData, setVpnData] = useState<VpnStatusResponse | null>(null);
  const [vpnTesting, setVpnTesting] = useState(false);
  const [vpnError, setVpnError] = useState('');
  const [vpnSuccess, setVpnSuccess] = useState('');
  const [vpnTestedAt, setVpnTestedAt] = useState<Date | null>(null);

  // Card & Dashboard Preferences
  const [prefs, setPrefs] = useState<UserPreferences>(() => getUserPreferences(user?.id));
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [prefsSavedMessage, setPrefsSavedMessage] = useState(false);

  // Load available services & categories for preference toggles
  useEffect(() => {
    api.get<Service[]>('/services')
      .then((data) => {
        setServices(data);
        const cats = Array.from(new Set(data.map(s => s.category?.trim() || 'Services'))).filter(Boolean);
        setAllCategories(cats);
      })
      .catch(() => {
        setAllCategories(['Management', 'Network', 'System', 'Dev', 'Gaming', 'IOT']);
      });
  }, []);

  // VPN Status Check & Light Polling while active
  const testVpnConnection = async () => {
    setVpnTesting(true);
    setVpnError('');
    setVpnSuccess('');
    try {
      const res = await api.get<VpnStatusResponse>('/vpn-status');
      setVpnData(res);
      setVpnTestedAt(new Date());
      if (res.connected) {
        setVpnSuccess(`Connected successfully via ${res.isVpn ? 'WireGuard VPN' : 'Home LAN'} (${res.ip})`);
      } else {
        setVpnSuccess(`External IP detected (${res.ip || 'WAN'}) — internal services locked`);
      }
      setTimeout(() => setVpnSuccess(''), 4000);
    } catch (err: any) {
      setVpnError(err.message || 'Failed to check VPN status');
    } finally {
      setVpnTesting(false);
    }
  };

  useEffect(() => {
    testVpnConnection();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        api.get<VpnStatusResponse>('/vpn-status')
          .then((res) => {
            setVpnData(res);
            setVpnTestedAt(new Date());
          })
          .catch(() => {});
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const flashPrefsNotice = () => {
    setPrefsSavedMessage(true);
    setTimeout(() => setPrefsSavedMessage(false), 2500);
  };

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

  const handleAccountDeleted = async () => {
    await logout();
    navigate('/');
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
        <div className="mb-8 p-6 rounded-2xl border border-slate-800/80 bg-[#16181f]/80 backdrop-blur-md flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 flex-1">
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

          {/* Network & VPN Status Widget */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2.5 pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
            <button
              type="button"
              onClick={() => setActiveTab('network')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-mono transition-all ${
                vpnData?.connected
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
              }`}
              title="View Network & WireGuard Diagnostics"
            >
              <span className={`w-2 h-2 rounded-full ${vpnData?.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="font-semibold">
                {vpnData ? (vpnData.connected ? (vpnData.isVpn ? 'WireGuard VPN' : 'Home LAN') : 'External (Restricted)') : 'Checking Network...'}
              </span>
            </button>

            <button
              type="button"
              onClick={testVpnConnection}
              disabled={vpnTesting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/90 text-slate-400 hover:text-white text-[11px] font-mono transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${vpnTesting ? 'animate-spin text-red-500' : ''}`} />
              {vpnTesting ? 'Testing...' : 'Test Connection'}
            </button>
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
            onClick={() => setActiveTab('network')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'network'
                ? 'bg-red-600 text-white shadow-[0_0_20px_-4px_rgba(239,68,68,0.5)]'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Network & WireGuard
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
          <PersonalDetailsSection user={user} onUserUpdate={(u) => setUser(u)} />
        )}

        {/* Tab 2: Security & Password */}
        {activeTab === 'security' && (
          <SecurityPasswordSection />
        )}

        {/* Tab 3: Network & WireGuard VPN */}
        {activeTab === 'network' && (
          <NetworkDiagnosticsSection
            vpnData={vpnData}
            vpnTesting={vpnTesting}
            vpnTestedAt={vpnTestedAt}
            onTestConnection={testVpnConnection}
            vpnSuccess={vpnSuccess}
            vpnError={vpnError}
          />
        )}

        {/* Tab 4: Dashboard Cards & Visibility Preferences */}
        {activeTab === 'preferences' && (
          <DashboardPreferencesSection
            prefs={prefs}
            allCategories={allCategories}
            services={services}
            prefsSavedMessage={prefsSavedMessage}
            onToggleCategory={toggleCategoryVisibility}
            onToggleGauge={toggleGaugeVisibility}
            onResetPreferences={resetPreferences}
          />
        )}

        {/* Tab 5: Danger Zone */}
        {activeTab === 'danger' && (
          <DangerZoneSection user={user} onAccountDeleted={handleAccountDeleted} />
        )}
      </main>
    </div>
  );
}
