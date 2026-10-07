import React, { useState } from 'react';
import {
  Lock,
  Shield,
  ExternalLink,
  Copy,
  Check,
  Edit2,
  Trash2,
  Activity,
  Film,
} from 'lucide-react';
import { Service, JellyfinStats } from '../../../types';
import { ServiceIcon } from '../common';

export interface ServiceCardItemProps {
  service: Service;
  colSpan: number;
  rowSpan: number;
  isOwner?: boolean;
  onCardClick?: (s: Service, e?: React.MouseEvent) => void;
  onEdit?: (s: Service) => void;
  onDelete?: (id: number) => void;
  onInspect?: (type: 'wireguard' | 'pihole' | 'qbittorrent' | 'jellyfin' | 'jellyseerr') => void;
  locked?: boolean;
  jellyfinStats?: JellyfinStats | null;
  noFrame?: boolean;
}

export function ServiceCardItem({
  service: s,
  colSpan,
  rowSpan,
  isOwner = false,
  onCardClick,
  onEdit,
  onDelete,
  onInspect,
  locked = false,
  jellyfinStats,
  noFrame = false,
}: ServiceCardItemProps) {
  const [copied, setCopied] = useState<boolean>(false);

  const isOnline = s.status === 'online';
  const isOffline = s.status === 'offline' || s.status === 'timeout';
  const isCompact = colSpan === 1 && rowSpan === 1;
  const isTall = colSpan === 1 && rowSpan >= 2;
  const isExpanded = colSpan >= 2 && rowSpan >= 2;

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (s.url && s.url !== '#') {
      navigator.clipboard.writeText(s.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const cleanUrl =
    s.url && s.url !== '#'
      ? s.url.replace(/^https?:\/\//, '').replace(/\/$/, '')
      : s.description || 'Local Service';

  const frameClasses = noFrame
    ? 'w-full h-full'
    : `w-full h-full rounded-xl border transition-all duration-150 select-none overflow-hidden ${
        locked
          ? 'border-amber-500/30 bg-[#16181f]/60 opacity-60 hover:opacity-85 hover:border-amber-500/50 hover:shadow-lg'
          : 'border-slate-800/80 bg-[#16181f]/80 hover:bg-[#1c1f2b] hover:border-slate-700/80 hover:shadow-lg'
      }`;

  return (
    <div
      onClick={(e) => onCardClick?.(s, e)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onCardClick?.(s);
      }}
      className={`group relative flex flex-col justify-between cursor-pointer select-none overflow-hidden ${frameClasses} ${
        isCompact ? 'p-2.5' : isTall ? 'p-3' : isExpanded ? 'p-3.5' : 'p-3'
      }`}
    >
      {/* CASE 1: 1x1 Compact Tile */}
      {isCompact ? (
        <div className="flex flex-col justify-between h-full">
          <div className="flex items-start justify-between gap-1">
            <div className="flex items-center gap-2 min-w-0 pr-1">
              <ServiceIcon icon={s.icon} title={s.title} />
              <div className="min-w-0">
                <div className="font-bold text-xs text-slate-100 group-hover:text-red-400 transition-colors truncate flex items-center gap-1">
                  <span className="truncate">{s.title || 'Untitled'}</span>
                  {locked && <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
                </div>
              </div>
            </div>

            {/* Hover Actions in 1x1 */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-[#16181f]/90 rounded-md p-0.5 border border-slate-700/60 shadow shrink-0">
              <button
                type="button"
                onClick={handleCopy}
                className="p-0.5 text-slate-400 hover:text-white rounded"
                title="Copy URL"
              >
                {copied ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
              </button>
              {isOwner && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onEdit?.(s);
                  }}
                  className="p-0.5 text-slate-400 hover:text-white rounded"
                  title="Edit"
                >
                  <Edit2 className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          </div>

          {/* Bottom Info: URL / Stat and Status Dot */}
          <div className="flex items-center justify-between text-[10px] font-mono pt-1 text-slate-500 border-t border-slate-800/40">
            <span className="truncate pr-1">{s.liveStat || cleanUrl}</span>
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isOnline ? 'bg-emerald-400 animate-pulse' : isOffline ? 'bg-rose-500' : 'bg-slate-500'
              }`}
            />
          </div>
        </div>
      ) : isTall ? (
        /* CASE 2: 1-Column Tall (1x2+) */
        <div className="flex flex-col justify-between h-full space-y-2">
          <div>
            <div className="flex items-center justify-between">
              <ServiceIcon icon={s.icon} title={s.title} />
              <div
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                  isOnline
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : isOffline
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isOnline ? 'bg-emerald-400' : isOffline ? 'bg-rose-500' : 'bg-slate-500'
                  }`}
                />
                <span>{s.status || 'ping'}</span>
              </div>
            </div>

            <div className="mt-2">
              <div className="font-bold text-xs text-slate-100 group-hover:text-red-400 transition-colors truncate flex items-center gap-1">
                <span className="truncate">{s.title || 'Untitled'}</span>
                {locked && <Lock className="w-3 h-3 text-amber-400 shrink-0" />}
              </div>
              <span className="text-[10px] font-mono text-slate-500 truncate block mt-0.5">
                {cleanUrl}
              </span>
            </div>

            {s.description && (
              <p className="text-[11px] text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                {s.description}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[10px]">
            {s.liveStat ? (
              <span className="text-red-400 font-mono truncate">{s.liveStat}</span>
            ) : (
              <span className="text-slate-500 font-mono capitalize">{s.category || 'Service'}</span>
            )}

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={handleCopy}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                title="Copy URL"
              >
                {copied ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
              </button>
              {isOwner && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onEdit?.(s);
                  }}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                  title="Edit"
                >
                  <Edit2 className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : isExpanded ? (
        /* CASE 3: Multi-column Expanded (2x2+) */
        <div className="flex flex-col justify-between h-full space-y-3">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <ServiceIcon icon={s.icon} title={s.title} />
                <div className="min-w-0">
                  <div className="font-bold text-sm text-slate-100 group-hover:text-red-400 transition-colors truncate flex items-center gap-1.5">
                    <span>{s.title || 'Untitled'}</span>
                    {locked ? (
                      <Lock className="w-3 h-3 text-amber-400 shrink-0" title="VPN or LAN required" />
                    ) : (
                      <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 truncate block mt-0.5">
                    {cleanUrl}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {locked ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    <Lock className="w-2.5 h-2.5 text-amber-400" />
                    VPN
                  </span>
                ) : s.requires_vpn ? (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20">
                    <Shield className="w-2.5 h-2.5 text-purple-400" />
                    VPN
                  </span>
                ) : null}

                <div
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider border ${
                    isOnline
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : isOffline
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isOnline ? 'bg-emerald-400 animate-pulse' : isOffline ? 'bg-rose-500' : 'bg-slate-500'
                    }`}
                  />
                  <span>{s.status || 'ping'}</span>
                </div>

                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                    title="Copy URL"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                  {isOwner && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onEdit?.(s);
                        }}
                        className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                        title="Edit"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onDelete?.(s.id);
                        }}
                        className="p-1 text-slate-400 hover:text-red-400 rounded hover:bg-slate-800"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {s.description && (
              <p className="text-xs text-slate-300 mt-2.5 line-clamp-2 leading-relaxed">
                {s.description}
              </p>
            )}

            {/* Jellyfin stream snippet */}
            {(s.telemetryType === 'jellyfin' || s.title.toLowerCase().includes('jellyfin')) && jellyfinStats && (
              <div className="mt-2.5 p-2 rounded-xl bg-purple-950/25 border border-purple-500/20">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <div className="flex items-center gap-1.5 text-purple-300 font-bold">
                    <Film className="w-3.5 h-3.5 text-purple-400" />
                    <span>Jellyfin Media</span>
                  </div>
                  <span className="text-purple-400 text-[10px]">
                    {jellyfinStats.activeStreamCount || 0} active stream{jellyfinStats.activeStreamCount === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-mono text-[11px]">{s.liveStat || 'Operational'}</span>
            <span className="text-[10px] text-slate-500 font-mono capitalize">{s.category || 'Services'}</span>
          </div>
        </div>
      ) : (
        /* CASE 4: Standard 2x1 Horizontal Card */
        <div className="flex items-center justify-between gap-3 h-full">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <ServiceIcon icon={s.icon} title={s.title} />
            <div className="min-w-0">
              <div className="font-bold text-xs text-slate-100 group-hover:text-red-400 transition-colors truncate flex items-center gap-1.5">
                <span className="truncate">{s.title || 'Untitled'}</span>
                {locked ? (
                  <Lock className="w-3 h-3 text-amber-400 shrink-0" title="VPN or LAN required" />
                ) : (
                  <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                )}
              </div>
              <span className="text-[10px] font-mono text-slate-500 truncate block mt-0.5">
                {cleanUrl}
              </span>
              {s.liveStat && (
                <span className="text-[10px] text-red-400 font-mono truncate block mt-0.5 font-semibold">
                  {s.liveStat}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {locked ? (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30">
                <Lock className="w-2.5 h-2.5 text-amber-400" />
                VPN
              </span>
            ) : s.requires_vpn ? (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20">
                <Shield className="w-2.5 h-2.5 text-purple-400" />
                VPN
              </span>
            ) : null}

            <div
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider border ${
                isOnline
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : isOffline
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isOnline ? 'bg-emerald-400 animate-pulse' : isOffline ? 'bg-rose-500' : 'bg-slate-500'
                }`}
              />
              <span>{s.status || 'ping'}</span>
            </div>

            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {s.telemetryType && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onInspect?.(s.telemetryType!);
                  }}
                  className="p-1 text-slate-400 hover:text-emerald-400 rounded hover:bg-slate-800"
                  title="Inspect telemetry"
                >
                  <Activity className="w-3 h-3 text-emerald-400" />
                </button>
              )}
              <button
                type="button"
                onClick={handleCopy}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                title="Copy URL"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
              {isOwner && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onEdit?.(s);
                    }}
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                    title="Edit"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDelete?.(s.id);
                    }}
                    className="p-1 text-slate-400 hover:text-red-400 rounded hover:bg-slate-800"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
