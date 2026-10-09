import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  User as UserIcon,
  ChevronDown,
  ChevronRight,
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
  SlidersHorizontal,
  Sparkles,
  Download,
  Upload,
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
  // Layer accordion state: only one dropdown can be open at a time
  const [activeLayer, setActiveLayer] = useState<string | null>('layout');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const toggleLayer = (layerKey: string) => {
    setActiveLayer((prev) => (prev === layerKey ? null : layerKey));
  };

  const toggleCategoryExpand = (cat: string) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const toggleCategoryHide = (cat: string) => {
    const isHidden = prefs.hiddenCategories.includes(cat);
    const updatedHidden = isHidden
      ? prefs.hiddenCategories.filter((c) => c !== cat)
      : [...prefs.hiddenCategories, cat];

    const updated: UserPreferences = { ...prefs, hiddenCategories: updatedHidden };
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

  const handleExportLayout = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(prefs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `mymanager-layout-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportLayout = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && typeof parsed === 'object') {
          onUpdatePrefs(parsed);
          saveUserPreferences(userId, parsed);
        }
      } catch (err) {
        alert('Invalid JSON layout file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const widgetsList = [
    { key: 'nodes', label: 'Cluster Nodes', icon: Server, color: 'text-red-400', desc: 'Monitors localhost, .136, .112, .41' },
    { key: 'speedtest', label: 'Internet Speed', icon: Wifi, color: 'text-emerald-400', desc: '10s on-demand WAN benchmark' },
    { key: 'qbittorrent', label: 'qBittorrent', icon: DownloadCloud, color: 'text-sky-400', desc: 'Live transfers, ETA and progress' },
    { key: 'pihole', label: 'Pi-hole DNS', icon: ShieldCheck, color: 'text-rose-400', desc: 'Queries, ad block ratio & clients' },
    { key: 'wireguard', label: 'WireGuard VPN', icon: Shield, color: 'text-purple-400', desc: 'Active peers, transfer & tunnels' },
    { key: 'jellyfin', label: 'Jellyfin Media', icon: Tv, color: 'text-indigo-400', desc: 'Live playback streams & sessions' },
    { key: 'jellyseerr', label: 'Jellyseerr', icon: Clapperboard, color: 'text-cyan-400', desc: 'Media requests approval queue' },
    { key: 'clock', label: 'Time & Uptime', icon: Clock, color: 'text-blue-400', desc: 'Local clock and host uptime' },
    { key: 'notes', label: 'Quick Notes', icon: Clipboard, color: 'text-amber-400', desc: 'Scratchpad and quick clipboard' },
  ];

  const activeWidgetsCount = widgetsList.filter(
    (w) => (prefs.widgetVisible as any)?.[w.key] !== false
  ).length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Dashboard Settings & Customization"
      footer={
        <div className="flex items-center justify-between w-full">
          <Link
            to="/profile"
            onClick={onClose}
            className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1.5"
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
      <div className="space-y-3 text-xs">
        {/* ========================================================= */}
        {/* ========================================================= */}
        {/* LAYER 1: BACKUP & RESTORE */}
        {/* ========================================================= */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => toggleLayer('layout')}
            className="w-full p-3.5 flex items-center justify-between bg-slate-900/90 hover:bg-slate-850 border-b border-slate-800/80 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-5 h-5 rounded-md bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold flex items-center justify-center font-mono shrink-0">
                1
              </span>
              <div className="min-w-0">
                <span className="font-bold text-xs text-white block">Layer 1: Layout Backup & Restore</span>
                <p className="text-[11px] text-slate-400 truncate">
                  Export custom widget sizes & card positions to JSON, or restore a backup
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {activeLayer === 'layout' ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-500" />
              )}
            </div>
          </button>

          {activeLayer === 'layout' && (
            <div className="p-3.5 space-y-3 bg-slate-950/40">

              <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px]">
                <div>
                  <div className="font-semibold text-xs text-white flex items-center gap-2">
                    <Download className="w-3.5 h-3.5 text-sky-400" />
                    <span>Backup & Restore Layout</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Export your custom card positions, sizes, and preferences to JSON, or restore a backup.
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportLayout}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={handleExportLayout}
                    className="px-3 py-1.5 rounded-lg border border-slate-700 hover:border-sky-500/40 bg-slate-800 hover:bg-sky-500/10 text-slate-300 hover:text-sky-300 flex items-center gap-1.5 transition-colors font-medium"
                    title="Download JSON layout backup"
                  >
                    <Download className="w-3 h-3 text-sky-400" />
                    <span>Export JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg border border-slate-700 hover:border-emerald-500/40 bg-slate-800 hover:bg-emerald-500/10 text-slate-300 hover:text-emerald-300 flex items-center gap-1.5 transition-colors font-medium"
                    title="Upload JSON layout backup"
                  >
                    <Upload className="w-3 h-3 text-emerald-400" />
                    <span>Import JSON</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* LAYER 2: WIDGETS (TOP GRID) */}
        {/* ========================================================= */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => toggleLayer('widgets')}
            className="w-full p-3.5 flex items-center justify-between bg-slate-900/90 hover:bg-slate-850 border-b border-slate-800/80 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-5 h-5 rounded-md bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold flex items-center justify-center font-mono shrink-0">
                2
              </span>
              <div className="min-w-0">
                <span className="font-bold text-xs text-white block">Layer 2: Widgets (Top Grid)</span>
                <p className="text-[11px] text-slate-400 truncate">
                  Turn active dashboard widgets on and off individually
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {activeWidgetsCount} of {widgetsList.length} Active
              </span>
              {activeLayer === 'widgets' ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-500" />
              )}
            </div>
          </button>

          {activeLayer === 'widgets' && (
            <div className="p-3.5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 bg-slate-950/40">
              {widgetsList.map((w) => {
                const IconComponent = w.icon;
                const isVis = (prefs.widgetVisible as any)?.[w.key] !== false;

                return (
                  <button
                    key={w.key}
                    type="button"
                    onClick={() => toggleWidget(w.key)}
                    className={`p-3 rounded-xl border text-left flex items-start justify-between gap-2 transition-all ${
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
          )}
        </div>

        {/* ========================================================= */}
        {/* LAYER 3: CATEGORY COLUMNS & SERVICES VISIBILITY */}
        {/* ========================================================= */}
        {/* ========================================================= */}
        {/* LAYER 3: SERVICES VISIBILITY */}
        {/* ========================================================= */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => toggleLayer('services')}
            className="w-full p-3.5 flex items-center justify-between bg-slate-900/90 hover:bg-slate-850 border-b border-slate-800/80 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-5 h-5 rounded-md bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold flex items-center justify-center font-mono shrink-0">
                3
              </span>
              <div className="min-w-0">
                <span className="font-bold text-xs text-white block">Layer 3: Services Visibility</span>
                <p className="text-[11px] text-slate-400 truncate">
                  Show or hide individual service cards from the dashboard
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-mono text-slate-400">
                {services.filter(s => !prefs.hiddenServices?.includes(s.id)).length} of {services.length} Active
              </span>
              {activeLayer === 'services' ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-500" />
              )}
            </div>
          </button>

          {activeLayer === 'services' && (
            <div className="p-3.5 space-y-2 bg-slate-950/40 max-h-80 overflow-y-auto pr-1">
              {services.length === 0 ? (
                <div className="text-[11px] text-slate-500 py-3 text-center italic">
                  No services added yet
                </div>
              ) : (
                services.map((s) => {
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
                          <div className="text-xs font-semibold text-white truncate">{s.title}</div>
                          <div className="text-[10px] font-mono text-slate-500 truncate">
                            {s.url.replace(/^https?:\/\//, '')}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleServiceHide(s.id)}
                        className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-mono flex items-center gap-1.5 transition-all ${
                          !isSvcHidden
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-slate-800/40 border-slate-700/60 text-slate-500 hover:text-slate-400'
                        }`}
                        title={!isSvcHidden ? 'Hide service' : 'Show service'}
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
          )}
        </div>

        {/* ========================================================= */}
        {/* LAYER 4: SERVER TELEMETRY GAUGES (OWNER ROLE) */}
        {/* ========================================================= */}
        {isOwner && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => toggleLayer('gauges')}
              className="w-full p-3.5 flex items-center justify-between bg-slate-900/90 hover:bg-slate-850 border-b border-slate-800/80 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-5 h-5 rounded-md bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold flex items-center justify-center font-mono shrink-0">
                  4
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white">Layer 4: Server Telemetry Gauges</span>
                    <span className="text-[9px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                      Owner
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    Configure which metrics are visible per server node (CPU, RAM, Temp, Fan, Storage)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-mono text-slate-400">{nodes.length} Nodes</span>
                {activeLayer === 'gauges' ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                )}
              </div>
            </button>

            {activeLayer === 'gauges' && (
              <div className="p-3.5 space-y-3 bg-slate-950/40">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-[11px] text-slate-400">Toggle individual metric gauges per machine:</span>
                  {onResetServerGauges && (
                    <button
                      type="button"
                      onClick={onResetServerGauges}
                      className="text-[10px] font-mono text-red-400 hover:text-red-300 transition-colors"
                    >
                      Reset all to defaults
                    </button>
                  )}
                </div>

                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
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
                        className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-slate-200">{n.name}</span>
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
                                    : 'bg-slate-950/60 border-slate-800 text-slate-600'
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
          </div>
        )}

        {/* ========================================================= */}
        {/* LAYER 5: HARDWARE & ACCENT LIGHTING (OWNER ROLE) */}
        {/* ========================================================= */}
        {isOwner && onOpenPironman && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => toggleLayer('hardware')}
              className="w-full p-3.5 flex items-center justify-between bg-slate-900/90 hover:bg-slate-850 border-b border-slate-800/80 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-5 h-5 rounded-md bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold flex items-center justify-center font-mono shrink-0">
                  5
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white">Layer 5: Hardware & Case Lighting</span>
                    <span className="text-[9px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                      Owner
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    Raspberry Pi 5 Pironman case RGB LEDs and website accent synchronization
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {activeLayer === 'hardware' ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                )}
              </div>
            </button>

            {activeLayer === 'hardware' && (
              <div className="p-3.5 flex items-center justify-between bg-slate-950/40">
                <div className="pr-4">
                  <div className="font-semibold text-xs text-white flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-red-400" />
                    <span>Pironman RGB Lighting Controller</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Customize case RGB lighting animations, LED colors, and hardware temperature sync.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenPironman();
                  }}
                  className="px-3 py-1.5 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-400 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Configure RGB</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
