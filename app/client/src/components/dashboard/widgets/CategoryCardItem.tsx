import React from 'react';
import {
  Plus,
  Edit2,
  ExternalLink,
  Lock,
  Trash2,
  Folder,
} from 'lucide-react';
import { Service, JellyfinStats } from '../../../types';
import { ServiceIcon } from '../common/ServiceIcon';

export interface CategoryCardItemProps {
  category: string;
  services: Service[];
  colSpan: number;
  rowSpan: number;
  isOwner?: boolean;
  vpnConnected?: boolean;
  onCardClick?: (s: Service, e?: React.MouseEvent) => void;
  onEditService?: (s: Service) => void;
  onDeleteService?: (id: number) => void;
  onAddService?: (category: string) => void;
  onRenameCategory?: (category: string) => void;
  onInspect?: (type: 'wireguard' | 'pihole' | 'qbittorrent' | 'jellyfin' | 'jellyseerr') => void;
  isServiceVpnLocked?: (s: Service) => boolean;
  jellyfinStats?: JellyfinStats | null;
}

export function CategoryCardItem({
  category,
  services,
  colSpan,
  rowSpan,
  isOwner = false,
  onCardClick,
  onEditService,
  onDeleteService,
  onAddService,
  onRenameCategory,
  onInspect,
  isServiceVpnLocked,
  jellyfinStats,
}: CategoryCardItemProps) {
  const isWide = colSpan >= 4;

  return (
    <div className="flex flex-col h-full w-full p-3.5 select-none overflow-hidden bg-[#12141c]/90 rounded-xl border border-slate-800/80 hover:border-slate-700/80 transition-colors">
      {/* Category Header */}
      <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-800/60 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
            <Folder size={13} />
          </div>
          <span className="font-semibold text-xs sm:text-sm text-slate-100 truncate tracking-tight">
            {category}
          </span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-800/80 text-slate-400 border border-slate-700/50">
            {services.length}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0" data-no-drag="true">
          {isOwner && onAddService && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddService(category);
              }}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={`Add service to ${category}`}
            >
              <Plus size={13} />
            </button>
          )}

          {isOwner && onRenameCategory && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRenameCategory(category);
              }}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={`Rename ${category}`}
            >
              <Edit2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Services List / Grid inside Category Card */}
      <div className="flex-1 overflow-y-auto scrollbar-thin pr-0.5">
        {services.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-4 text-center border border-dashed border-slate-800/60 rounded-lg">
            <p className="text-xs text-slate-500">No services in this category</p>
            {isOwner && onAddService && (
              <button
                type="button"
                data-no-drag="true"
                onClick={() => onAddService(category)}
                className="mt-2 text-[11px] font-medium text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
              >
                <Plus size={12} /> Add service
              </button>
            )}
          </div>
        ) : (
          <div className={`grid gap-1.5 ${isWide ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {services.map((svc) => {
              const locked = isServiceVpnLocked ? isServiceVpnLocked(svc) : false;
              const hasExternal = Boolean(svc.url && svc.url !== '#');

              return (
                <div
                  key={svc.id}
                  data-no-drag="true"
                  onClick={(e) => {
                    if (onCardClick) onCardClick(svc, e);
                  }}
                  className={`group/item flex items-center justify-between p-2 rounded-lg border transition-all duration-150 cursor-pointer ${
                    locked
                      ? 'bg-amber-500/[0.04] border-amber-500/20 hover:border-amber-500/40'
                      : 'bg-slate-900/60 border-slate-800/60 hover:bg-slate-850 hover:border-slate-700/70 hover:shadow-sm'
                  }`}
                >
                  {/* Left: Icon and info */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-800/80 border border-slate-700/50 flex items-center justify-center overflow-hidden shrink-0">
                      <ServiceIcon icon={svc.icon} title={svc.title} size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-slate-200 truncate group-hover/item:text-white transition-colors">
                          {svc.title}
                        </span>
                        {locked && (
                          <span
                            className="px-1 py-0.2 rounded bg-amber-500/15 text-amber-400 text-[9px] font-medium flex items-center gap-0.5 border border-amber-500/30"
                            title="VPN connection required"
                          >
                            <Lock size={9} /> VPN
                          </span>
                        )}
                        {svc.telemetryType === 'jellyfin' && jellyfinStats && (
                          <span className="px-1 py-0.2 rounded bg-purple-500/15 text-purple-400 text-[9px] font-medium">
                            {jellyfinStats.activeStreamsCount || 0} active
                          </span>
                        )}
                      </div>
                      {svc.description && (
                        <p className="text-[10px] text-slate-500 truncate leading-tight mt-0.5">
                          {svc.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1 shrink-0 opacity-70 group-hover/item:opacity-100 transition-opacity">
                    {hasExternal && (
                      <a
                        href={svc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                        title="Open external link"
                      >
                        <ExternalLink size={12} />
                      </a>
                    )}

                    {isOwner && onEditService && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditService(svc);
                        }}
                        className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
                        title="Edit service"
                      >
                        <Edit2 size={11} />
                      </button>
                    )}

                    {isOwner && onDeleteService && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Delete ${svc.title}?`)) {
                            onDeleteService(svc.id);
                          }
                        }}
                        className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete service"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
