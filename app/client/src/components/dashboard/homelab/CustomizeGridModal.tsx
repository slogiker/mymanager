import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  User as UserIcon,
  Check,
  Eye,
  EyeOff,
  LayoutGrid,
  Layers,
  Server,
  Wifi,
  DownloadCloud,
  ShieldCheck,
  Shield,
  Tv,
  Clapperboard,
  Clock,
  Clipboard,
  Sparkles,
  Copy,
  ClipboardPaste,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Smartphone,
} from 'lucide-react';
import { Modal, ServiceIcon } from '../common';
import { UserPreferences, saveUserPreferences } from '../../../lib/userPreferences';
import { Service, ServerNode, SpeedtestResult } from '../../../types';

export interface CustomizeGridModalProps {
  open: boolean;
  onClose: () => void;
  prefs: UserPreferences;
  onUpdatePrefs: (updated: UserPreferences) => void;
  userId?: number;
  services: Service[];
  orderedCategories: string[];
  nodes?: ServerNode[];
  speedtest?: SpeedtestResult | null;
  onToggleServerGauge?: (nodeId: string, gaugeKey: string) => void;
  onResetServerGauges?: () => void;
  onOpenPironman?: () => void;
  isOwner?: boolean;
}

type TabType = 'layout' | 'widgets' | 'services' | 'gauges' | 'hardware';

export function CustomizeGridModal({
  open,
  onClose,
  prefs,
  onUpdatePrefs,
  userId,
  services,
  orderedCategories,
  nodes = [],
  speedtest,
  onToggleServerGauge,
  onResetServerGauges,
  onOpenPironman,
  isOwner = false,
}: CustomizeGridModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('layout');
  const [serviceSearch, setServiceSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showJsonPanel, setShowJsonPanel] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [copiedJson, setCopiedJson] = useState(false);
  const [jsonStatus, setJsonStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const toggleWidget = (widgetKey: string) => {
    const currentVis = (prefs.widgetVisible as any) || {};
    const isVis = currentVis[widgetKey] !== false;
    const updated: UserPreferences = {
      ...prefs,
      widgetVisible: {
        ...currentVis,
        [widgetKey]: !isVis,
      },
    };
    onUpdatePrefs(updated);
    saveUserPreferences(userId, updated);
  };

  const handleToggleAllWidgets = (enable: boolean) => {
    const nextVis: Record<string, boolean> = {};
    widgetsList.forEach((w) => {
      nextVis[w.key] = enable;
    });
    const updated: UserPreferences = {
      ...prefs,
      widgetVisible: nextVis as any,
    };
    onUpdatePrefs(updated);
    saveUserPreferences(userId, updated);
  };

  const toggleServiceHide = (serviceId: number) => {
    const currentHidden = prefs.hiddenServices || [];
    const isHidden = currentHidden.includes(serviceId);
    const updatedHidden = isHidden
      ? currentHidden.filter((id) => id !== serviceId)
      : [...currentHidden, serviceId];

    const updated: UserPreferences = { ...prefs, hiddenServices: updatedHidden };
    onUpdatePrefs(updated);
    saveUserPreferences(userId, updated);
  };

  const handleToggleAllServices = (showAll: boolean) => {
    const updatedHidden = showAll ? [] : services.map((s) => s.id);
    const updated: UserPreferences = { ...prefs, hiddenServices: updatedHidden };
    onUpdatePrefs(updated);
    saveUserPreferences(userId, updated);
  };

  const handleSetLayoutMode = (disableCategories: boolean) => {
    const updated: UserPreferences = { ...prefs, disableCategories };
    onUpdatePrefs(updated);
    saveUserPreferences(userId, updated);
  };

  const handleResetLayoutPositions = () => {
    if (!window.confirm('Reset all widget and card grid placements to defaults?')) return;
    const updated: UserPreferences = {
      ...prefs,
      widgetSizes: undefined,
      widgetLayouts: undefined,
    };
    onUpdatePrefs(updated);
    saveUserPreferences(userId, updated);
  };

  const handleCopyJson = async () => {
    const serialized = JSON.stringify(prefs, null, 2);
    setJsonText(serialized);
    setJsonStatus(null);
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(serialized);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = serialized;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedJson(true);
      setJsonStatus({ type: 'success', message: 'Layout JSON copied to clipboard!' });
      setTimeout(() => setCopiedJson(false), 2000);
    } catch {
      setShowJsonPanel(true);
      setJsonStatus({ type: 'error', message: 'Could not auto-copy. Select and copy the JSON below.' });
    }
  };

  const handleOpenPastePanel = async () => {
    setJsonStatus(null);
    if (!showJsonPanel) {
      setShowJsonPanel(true);
      try {
        if (navigator.clipboard && window.isSecureContext) {
          const clip = await navigator.clipboard.readText();
          if (clip && clip.trim().startsWith('{')) {
            setJsonText(clip);
            return;
          }
        }
      } catch {
        // Fallback to manual paste in textarea
      }
      if (!jsonText) {
        setJsonText(JSON.stringify(prefs, null, 2));
      }
    } else {
      setShowJsonPanel(false);
    }
  };

  const handleApplyJson = () => {
    if (!jsonText.trim()) {
      setJsonStatus({ type: 'error', message: 'Please paste your layout JSON first.' });
      return;
    }
    try {
      const parsed = JSON.parse(jsonText);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        onUpdatePrefs(parsed);
        saveUserPreferences(userId, parsed);
        setJsonStatus({ type: 'success', message: 'Layout configuration imported and saved!' });
      } else {
        setJsonStatus({ type: 'error', message: 'Invalid layout JSON object.' });
      }
    } catch {
      setJsonStatus({ type: 'error', message: 'Invalid JSON syntax. Please check the pasted text.' });
    }
  };

  const widgetsList = [
    { key: 'nodes', label: 'Cluster Nodes', icon: Server, color: 'text-red-400', desc: 'Monitors localhost, .136, .112, .41 telemetry' },
    { key: 'speedtest', label: 'Internet Speed', icon: Wifi, color: 'text-emerald-400', desc: 'On-demand WAN benchmark test' },
    { key: 'qbittorrent', label: 'qBittorrent', icon: DownloadCloud, color: 'text-sky-400', desc: 'Live transfers, ETA and progress' },
    { key: 'pihole', label: 'Pi-hole DNS', icon: ShieldCheck, color: 'text-rose-400', desc: 'Queries, ad block ratio and clients' },
    { key: 'wireguard', label: 'WireGuard VPN', icon: Shield, color: 'text-purple-400', desc: 'Active peers, transfer and tunnels' },
    { key: 'jellyfin', label: 'Jellyfin Media', icon: Tv, color: 'text-indigo-400', desc: 'Live playback streams and sessions' },
    { key: 'jellyseerr', label: 'Jellyseerr', icon: Clapperboard, color: 'text-cyan-400', desc: 'Media requests approval queue' },
    { key: 'clock', label: 'Time & Uptime', icon: Clock, color: 'text-blue-400', desc: 'Local clock and host uptime counter' },
    { key: 'notes', label: 'Quick Notes', icon: Clipboard, color: 'text-amber-400', desc: 'Scratchpad and quick clipboard notes' },
  ];

  const activeWidgetsCount = widgetsList.filter(
    (w) => (prefs.widgetVisible as any)?.[w.key] !== false
  ).length;

  const visibleServicesCount = services.filter(
    (s) => !prefs.hiddenServices?.includes(s.id)
  ).length;

  // Filter services by category and search text
  const filteredServicesList = useMemo(() => {
    return services.filter((s) => {
      const sCat = s.category?.trim() || 'Services';
      if (selectedCategory !== 'all' && sCat !== selectedCategory) {
        return false;
      }
      if (serviceSearch.trim()) {
        const query = serviceSearch.toLowerCase();
        const matchesTitle = s.title.toLowerCase().includes(query);
        const matchesUrl = s.url.toLowerCase().includes(query);
        const matchesCat = sCat.toLowerCase().includes(query);
        if (!matchesTitle && !matchesUrl && !matchesCat) return false;
      }
      return true;
    });
  }, [services, selectedCategory, serviceSearch]);

  const categoriesSet = useMemo(() => {
    const list: string[] = [];
    services.forEach((s) => {
      const c = s.category?.trim() || 'Services';
      if (!list.includes(c)) list.push(c);
    });
    orderedCategories.forEach((c) => {
      if (!list.includes(c)) list.push(c);
    });
    return list;
  }, [services, orderedCategories]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Dashboard Settings & Customization"
      maxWidth="max-w-3xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Link
            to="/profile"
            onClick={onClose}
            className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1.5 transition-colors"
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Full Account Settings</span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-red-600/20 transition-all"
          >
            Done
          </button>
        </div>
      }
    >
      <div className="space-y-5 text-xs">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 border border-slate-800/80 rounded-xl overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('layout')}
            className={`px-3.5 py-2 rounded-lg font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'layout'
                ? 'bg-red-600/15 border border-red-500/40 text-red-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Layout & Mode</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('widgets')}
            className={`px-3.5 py-2 rounded-lg font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'widgets'
                ? 'bg-red-600/15 border border-red-500/40 text-red-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Widgets</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
              {activeWidgetsCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('services')}
            className={`px-3.5 py-2 rounded-lg font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'services'
                ? 'bg-red-600/15 border border-red-500/40 text-red-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Services</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
              {visibleServicesCount}/{services.length}
            </span>
          </button>

          {isOwner && (
            <button
              type="button"
              onClick={() => setActiveTab('gauges')}
              className={`px-3.5 py-2 rounded-lg font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
                activeTab === 'gauges'
                  ? 'bg-red-600/15 border border-red-500/40 text-red-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>Server Gauges</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-amber-500/15 text-amber-400 border border-amber-500/20">
                Owner
              </span>
            </button>
          )}

          {isOwner && onOpenPironman && (
            <button
              type="button"
              onClick={() => setActiveTab('hardware')}
              className={`px-3.5 py-2 rounded-lg font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
                activeTab === 'hardware'
                  ? 'bg-red-600/15 border border-red-500/40 text-red-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Hardware & RGB</span>
            </button>
          )}
        </div>

        {/* TAB 1: LAYOUT & MODE */}
        {activeTab === 'layout' && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Desktop Display Mode
                </span>
                <span className="text-[11px] text-slate-500">
                  Controls layout arrangement on PC viewports
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Category Mode Selection Card */}
                <button
                  type="button"
                  onClick={() => handleSetLayoutMode(false)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    !prefs.disableCategories
                      ? 'bg-red-500/[0.04] border-red-500/50 shadow-md'
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg border ${
                        !prefs.disableCategories
                          ? 'bg-red-500/10 border-red-500/20 text-red-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}>
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-white">Category Mode</div>
                        <span className="text-[10px] font-semibold text-emerald-400">Default on PC</span>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                      !prefs.disableCategories
                        ? 'bg-red-600 border-red-500 text-white'
                        : 'border-slate-700 bg-slate-800'
                    }`}>
                      {!prefs.disableCategories && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 mt-2.5 leading-relaxed">
                    Modular widgets are placed in a dedicated grid at the top, and services are grouped into category columns below.
                  </p>

                  <div className="mt-3 p-2 rounded-lg bg-black/40 border border-slate-800/80 font-mono text-[10px] text-slate-400 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>Top: Modular Widgets &bull; Bottom: Categories</span>
                  </div>
                </button>

                {/* Flat Mode Selection Card */}
                <button
                  type="button"
                  onClick={() => handleSetLayoutMode(true)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    prefs.disableCategories
                      ? 'bg-red-500/[0.04] border-red-500/50 shadow-md'
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg border ${
                        prefs.disableCategories
                          ? 'bg-red-500/10 border-red-500/20 text-red-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}>
                        <LayoutGrid className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-white">Flat Grid Mode</div>
                        <span className="text-[10px] font-semibold text-sky-400">Unified Canvas</span>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                      prefs.disableCategories
                        ? 'bg-red-600 border-red-500 text-white'
                        : 'border-slate-700 bg-slate-800'
                    }`}>
                      {prefs.disableCategories && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 mt-2.5 leading-relaxed">
                    All widgets and individual service cards are merged into a single responsive 8-column canvas without category boxes.
                  </p>

                  <div className="mt-3 p-2 rounded-lg bg-black/40 border border-slate-800/80 font-mono text-[10px] text-slate-400 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                    <span>Unified 8-column freeform grid</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Mobile Notice Card */}
            <div className="p-3.5 rounded-xl border border-sky-500/20 bg-sky-500/[0.05] flex items-start gap-3">
              <Smartphone className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
              <div className="text-[11px] text-slate-300 leading-relaxed">
                <span className="font-semibold text-sky-300">Mobile Layout: </span>
                Phones and touch tablets automatically display a streamlined unified flow without bulky category columns for quick thumb navigation.
              </div>
            </div>

            {/* Layout Tools & Backup Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-xs text-white">Reset Grid Placement</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Restore default widget sizes and card positions
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleResetLayoutPositions}
                  className="px-3 py-1.5 rounded-lg border border-red-500/30 hover:border-red-500/50 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-xs text-white">JSON Copy & Paste</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Copy layout JSON or paste a saved config
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors text-[11px] font-medium ${
                      copiedJson
                        ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                        : 'border-slate-700 hover:border-sky-500/40 bg-slate-800 hover:bg-sky-500/10 text-slate-300 hover:text-sky-300'
                    }`}
                    title="Copy layout JSON to clipboard"
                  >
                    {copiedJson ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-sky-400" />
                        <span>Copy JSON</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenPastePanel}
                    className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors text-[11px] font-medium ${
                      showJsonPanel
                        ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                        : 'border-slate-700 hover:border-emerald-500/40 bg-slate-800 hover:bg-emerald-500/10 text-slate-300 hover:text-emerald-300'
                    }`}
                    title="Paste or edit layout JSON"
                  >
                    <ClipboardPaste className="w-3 h-3 text-emerald-400" />
                    <span>{showJsonPanel ? 'Hide Paste' : 'Paste JSON'}</span>
                  </button>
                </div>
              </div>
            </div>

            {showJsonPanel && (
              <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/80 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-slate-300">
                    Paste or Edit Layout JSON Configuration
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setJsonText(JSON.stringify(prefs, null, 2));
                        setJsonStatus(null);
                      }}
                      className="text-[10px] font-mono text-sky-400 hover:text-sky-300 transition-colors"
                    >
                      Load Current
                    </button>
                    <span className="text-slate-700">&bull;</span>
                    <button
                      type="button"
                      onClick={() => {
                        setJsonText('');
                        setJsonStatus(null);
                      }}
                      className="text-[10px] font-mono text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <textarea
                  value={jsonText}
                  onChange={(e) => {
                    setJsonText(e.target.value);
                    if (jsonStatus) setJsonStatus(null);
                  }}
                  placeholder="Paste your layout JSON here (Ctrl+V)..."
                  rows={6}
                  spellCheck={false}
                  className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 resize-y"
                />

                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px]">
                    {jsonStatus && (
                      <span
                        className={
                          jsonStatus.type === 'success' ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'
                        }
                      >
                        {jsonStatus.message}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowJsonPanel(false)}
                      className="px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-[11px] font-medium transition-colors"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyJson}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Apply JSON</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: WIDGETS */}
        {activeTab === 'widgets' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
              <span className="text-slate-400 text-[11px]">
                Toggle which modular widgets appear in the top grid:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleAllWidgets(true)}
                  className="text-[11px] text-red-400 hover:text-red-300 font-semibold transition-colors"
                >
                  Enable All
                </button>
                <span className="text-slate-600">&bull;</span>
                <button
                  type="button"
                  onClick={() => handleToggleAllWidgets(false)}
                  className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Disable All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {widgetsList.map((w) => {
                const IconComponent = w.icon;
                const isVis = (prefs.widgetVisible as any)?.[w.key] !== false;

                return (
                  <button
                    key={w.key}
                    type="button"
                    onClick={() => toggleWidget(w.key)}
                    className={`p-3 rounded-xl border text-left flex items-start justify-between gap-2.5 transition-all ${
                      isVis
                        ? 'bg-red-500/[0.04] border-red-500/40 text-white'
                        : 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-60 hover:opacity-80'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        className={`p-2 rounded-lg border shrink-0 ${
                          isVis
                            ? 'bg-red-500/10 border-red-500/20 text-red-400'
                            : 'bg-slate-800 border-slate-700 text-slate-500'
                        }`}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs truncate">{w.label}</div>
                        <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                          {w.desc}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center border shrink-0 mt-0.5 transition-all ${
                        isVis
                          ? 'bg-red-600 border-red-500 text-white'
                          : 'border-slate-700 bg-slate-800'
                      }`}
                    >
                      {isVis && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: SERVICES VISIBILITY */}
        {activeTab === 'services' && (
          <div className="space-y-3.5">
            {/* Filter and Search Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  placeholder="Filter services by title or url..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-900/90 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-500/50"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleAllServices(true)}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
                >
                  Show All
                </button>
                <span className="text-slate-600">&bull;</span>
                <button
                  type="button"
                  onClick={() => handleToggleAllServices(false)}
                  className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Hide All
                </button>
              </div>
            </div>

            {/* Category Filter Chips */}
            {categoriesSet.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30 font-semibold'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({services.length})
                </button>
                {categoriesSet.map((cat) => {
                  const count = services.filter((s) => (s.category?.trim() || 'Services') === cat).length;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                        selectedCategory === cat
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30 font-semibold'
                          : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {cat} ({count})
                    </button>
                  );
                })}
              </div>
            )}

            {/* Scrollable Services List */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {filteredServicesList.length === 0 ? (
                <div className="text-[11px] text-slate-500 py-6 text-center italic border border-dashed border-slate-800 rounded-xl">
                  {serviceSearch ? `No services matched "${serviceSearch}"` : 'No services in this category'}
                </div>
              ) : (
                filteredServicesList.map((s) => {
                  const isSvcHidden = prefs.hiddenServices?.includes(s.id) ?? false;
                  return (
                    <div
                      key={s.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                        !isSvcHidden
                          ? 'bg-slate-900/80 border-slate-800/80 text-slate-200'
                          : 'bg-slate-950/60 border-slate-800/40 text-slate-500 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <ServiceIcon icon={s.icon} title={s.title} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white truncate">{s.title}</span>
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-1.5 py-0.2 rounded">
                              {s.category?.trim() || 'Services'}
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 truncate mt-0.5">
                            {s.url.replace(/^https?:\/\//, '')}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleServiceHide(s.id)}
                        className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-mono flex items-center gap-1.5 transition-all shrink-0 ${
                          !isSvcHidden
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-slate-800/40 border-slate-700/60 text-slate-500 hover:text-slate-400'
                        }`}
                        title={!isSvcHidden ? 'Hide service from dashboard' : 'Show service on dashboard'}
                      >
                        {!isSvcHidden ? (
                          <>
                            <Eye className="w-3 h-3 text-emerald-400" />
                            <span>Visible</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3 text-slate-500" />
                            <span>Hidden</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 4: SERVER TELEMETRY GAUGES (OWNER) */}
        {isOwner && activeTab === 'gauges' && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
              <span className="text-slate-400 text-[11px]">
                Toggle metric gauge pills shown on each machine:
              </span>
              {onResetServerGauges && (
                <button
                  type="button"
                  onClick={onResetServerGauges}
                  className="text-[11px] font-mono text-red-400 hover:text-red-300 transition-colors"
                >
                  Reset to defaults
                </button>
              )}
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {nodes.map((n) => {
                const currentGauges = (prefs.serverGauges as any)?.[n.id] || {};
                const metrics = [
                  { key: 'cpu', label: 'CPU' },
                  { key: 'ram', label: 'RAM' },
                  { key: 'temp', label: 'Temp' },
                  { key: 'fan', label: 'Fan' },
                  { key: 'storage', label: 'Storage' },
                  { key: 'net', label: 'Network' },
                  { key: 'ping', label: 'Ping' },
                ];

                return (
                  <div
                    key={n.id}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-white">{n.name}</span>
                        <span className="text-[10px] font-mono text-slate-500">{n.ip}</span>
                      </div>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                          n.status === 'online'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {n.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {metrics.map((m) => {
                        const isEnabled = currentGauges[m.key] !== false;
                        return (
                          <button
                            key={m.key}
                            type="button"
                            onClick={() => onToggleServerGauge?.(n.id, m.key)}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all ${
                              isEnabled
                                ? 'bg-red-500/10 border-red-500/40 text-red-300 font-semibold'
                                : 'bg-slate-950/60 border-slate-800 text-slate-600 hover:text-slate-400'
                            }`}
                          >
                            {m.label} {isEnabled ? '✓' : '✕'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: HARDWARE & RGB (OWNER) */}
        {isOwner && onOpenPironman && activeTab === 'hardware' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="font-semibold text-xs text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-red-400" />
                  <span>Raspberry Pi 5 Pironman RGB Controller</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Configure hardware case RGB LED animations, lighting colors, fan thresholds, and synchronize the web dashboard accent color with your Raspberry Pi case.
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPironman();
                }}
                className="px-4 py-2 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-400 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Open Controller</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
