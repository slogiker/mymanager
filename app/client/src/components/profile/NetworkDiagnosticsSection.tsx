import React from 'react';
import { ShieldCheck, RefreshCw, CheckCircle2, AlertTriangle, Wifi, WifiOff, Globe } from 'lucide-react';

export interface VpnStatusResponse {
  connected: boolean;
  isVpn: boolean;
  isLan: boolean;
  ip: string;
  subnet: string;
  detectedAt: string;
}

interface NetworkDiagnosticsSectionProps {
  vpnData: VpnStatusResponse | null;
  vpnTesting: boolean;
  vpnTestedAt: Date | null;
  onTestConnection: () => void;
  vpnSuccess: string;
  vpnError: string;
}

export function NetworkDiagnosticsSection({
  vpnData,
  vpnTesting,
  vpnTestedAt,
  onTestConnection,
  vpnSuccess,
  vpnError,
}: NetworkDiagnosticsSectionProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800/80 bg-[#16181f] p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-red-500" />
              WireGuard VPN & LAN Diagnostics
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live detection of your connection route to the homelab infrastructure.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onTestConnection}
              disabled={vpnTesting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-[0_0_20px_-5px_rgba(239,68,68,0.5)] transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${vpnTesting ? 'animate-spin' : ''}`} />
              {vpnTesting ? 'Testing Connection...' : 'Test Connection'}
            </button>
          </div>
        </div>

        {vpnSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{vpnSuccess}</span>
          </div>
        )}
        {vpnError && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{vpnError}</span>
          </div>
        )}

        {/* Status Banner */}
        <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          vpnData?.connected
            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
            : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
        }`}>
          <div className="flex items-center gap-3.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              vpnData?.connected
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-[0_0_20px_-5px_rgba(16,185,129,0.5)]'
                : 'bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-[0_0_20px_-5px_rgba(245,158,11,0.5)]'
            }`}>
              {vpnData?.connected ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            </div>
            <div>
              <div className="font-bold text-sm text-white">
                {vpnData
                  ? (vpnData.connected
                    ? (vpnData.isVpn ? 'Connected via WireGuard VPN' : 'Connected via Home LAN')
                    : 'External Network Connection')
                  : 'Checking network status...'}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {vpnData?.connected
                  ? 'Full internal homelab access (.home.arpa services unlocked)'
                  : 'Remote access active — internal .home.arpa services are protected & locked'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase border ${
              vpnData?.connected
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
            }`}>
              <span className={`w-2 h-2 rounded-full ${vpnData?.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              {vpnData?.connected ? 'ACTIVE' : 'RESTRICTED'}
            </span>
          </div>
        </div>

        {/* Diagnostic Parameters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 font-mono">
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Detected Client IP</div>
            <div className="text-xs text-slate-200 font-bold break-all">
              {vpnData?.ip || 'Detecting...'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">WireGuard Subnet</div>
            <div className="text-xs text-slate-200 font-bold">
              {vpnData?.subnet || '10.7.235.0/24'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Internal .home.arpa</div>
            <div className={`text-xs font-bold ${vpnData?.connected ? 'text-emerald-400' : 'text-amber-400'}`}>
              {vpnData?.connected ? 'Unlocked' : 'Locked (VPN Req.)'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Last Status Check</div>
            <div className="text-xs text-slate-400">
              {vpnTestedAt ? vpnTestedAt.toLocaleTimeString() : 'Pending'}
            </div>
          </div>
        </div>

        {/* Homelab Info & Guide */}
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 text-xs text-slate-400 space-y-2">
          <div className="font-semibold text-slate-200 flex items-center gap-2">
            <Globe className="w-4 h-4 text-red-500" />
            About Homelab Network Security
          </div>
          <p className="leading-relaxed">
            Services hosted under <span className="font-mono text-slate-300">*.home.arpa</span> (such as Portainer, Pi-hole Admin, and raw telemetry nodes) do not expose public DNS records. When connected to the WireGuard VPN tunnel on <span className="font-mono text-slate-300">10.7.235.0/24</span>, traffic is securely routed directly through your internal DNS and gateway.
          </p>
        </div>
      </div>
    </div>
  );
}
