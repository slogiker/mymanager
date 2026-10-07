import React, { useMemo } from 'react';
import { GRID_CONSTANTS, getFillerCells } from '../../../lib/cardGridEngine';
import { UserPreferences } from '../../../lib/userPreferences';
import {
  QbittorrentStats,
  SpeedtestResult,
  ServerNode,
  PiholeStats,
  WireguardStats,
  JellyfinStats,
  JellyseerrStats,
  Service,
} from '../../../types';
import { useWidgetRegistry } from './useWidgetRegistry';
import { useWidgetGridInteractions } from './useWidgetGridInteractions';

export interface TopWidgetsGridProps {
  prefs: UserPreferences;
  onUpdatePrefs: (updated: UserPreferences) => void;
  userId?: number;
  uptime?: string;
  speedtest?: SpeedtestResult | null;
  onRunSpeedtest?: () => void;
  isRunningSpeedtest?: boolean;
  qbitStats?: QbittorrentStats | null;
  piholeStats?: PiholeStats | null;
  wgStats?: WireguardStats | null;
  jellyfinStats?: JellyfinStats | null;
  jellyseerrStats?: JellyseerrStats | null;
  onOpenInspector?: (type: 'wireguard' | 'pihole' | 'qbittorrent' | 'jellyfin' | 'jellyseerr') => void;
  nodes?: ServerNode[];
  loadingNodes?: boolean;
  isAdmin?: boolean;
  serverGauges?: Record<string, any>;
  onUpdateServerGauges?: (gauges: Record<string, any>) => void;
  onOpenPironman?: () => void;
  onOpenCustomize?: () => void;
  searchQuery?: string;
  flatMode?: boolean;
  categories?: string[];
  services?: Service[];
  onCardClick?: (s: Service, e?: React.MouseEvent) => void;
  onEditService?: (s: Service) => void;
  onDeleteService?: (id: number) => void;
  onAddService?: (category: string) => void;
  onRenameCategory?: (category: string) => void;
  onUpdateCardLayout?: (updates: Array<{ id: number; start_col: number; start_row: number; col_span: number; row_span: number }>) => void;
  isServiceVpnLocked?: (s: Service) => boolean;
}

export function TopWidgetsGrid({
  prefs,
  onUpdatePrefs,
  userId,
  uptime,
  speedtest,
  onRunSpeedtest,
  isRunningSpeedtest,
  qbitStats,
  piholeStats,
  wgStats,
  jellyfinStats,
  jellyseerrStats,
  onOpenInspector,
  onOpenPironman,
  onOpenCustomize,
  searchQuery,
  flatMode = false,
  categories = [],
  services = [],
  onCardClick,
  onEditService,
  onDeleteService,
  onAddService,
  onRenameCategory,
  onUpdateCardLayout,
  isServiceVpnLocked,
  nodes = [],
  loadingNodes = false,
  isAdmin = false,
  serverGauges = {},
}: TopWidgetsGridProps) {
  const { placedWidgets } = useWidgetRegistry({
    prefs,
    nodes,
    uptime,
    speedtest,
    onRunSpeedtest,
    isRunningSpeedtest,
    qbitStats,
    piholeStats,
    wgStats,
    jellyfinStats,
    jellyseerrStats,
    onOpenInspector,
    serverGauges,
    onOpenPironman,
    searchQuery,
    flatMode,
    categories,
    services,
    isAdmin,
    onCardClick,
    onEditService,
    onDeleteService,
    onAddService,
    onRenameCategory,
    isServiceVpnLocked,
  });

  const {
    gridRef,
    resizing,
    cardDragging,
    livePushedWidgets,
    cycleWidgetSize,
    handleStartCardDrag,
    handleStartResize,
  } = useWidgetGridInteractions({
    prefs,
    onUpdatePrefs,
    userId,
    placedWidgets,
    onUpdateCardLayout,
  });

  const activeWidgets = livePushedWidgets || placedWidgets;

  // Placeholder slots shown when user is dragging or resizing
  const fillerCells = useMemo(() => {
    const isInteracting = resizing !== null || cardDragging !== null;
    return getFillerCells(activeWidgets, GRID_CONSTANTS.FLAT_COLS, isInteracting ? 4 : 2);
  }, [activeWidgets, resizing, cardDragging]);

  if (activeWidgets.length === 0) {
    if (flatMode) {
      return (
        <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center bg-slate-900/30 backdrop-blur-md">
          <p className="text-sm font-semibold text-slate-300">
            {searchQuery ? `No cards or widgets matched "${searchQuery}".` : 'No cards or widgets are currently visible.'}
          </p>
          {onOpenCustomize && (
            <button
              type="button"
              onClick={onOpenCustomize}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition-colors"
            >
              <span>Customize Visible Cards & Widgets</span>
            </button>
          )}
        </div>
      );
    }
    return (
      <div className="rounded-2xl border border-dashed border-slate-800 p-6 text-center bg-slate-900/30 backdrop-blur-md">
        <p className="text-xs text-slate-400">All top widgets are currently hidden or disabled.</p>
        {onOpenCustomize && (
          <button
            type="button"
            onClick={onOpenCustomize}
            className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition-colors"
          >
            <span>+ Add Widgets to Dashboard</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div
        ref={gridRef}
        className="grid gap-2.5 relative select-none min-w-[700px] xl:min-w-0"
        style={{
          gridTemplateColumns: `repeat(${GRID_CONSTANTS.FLAT_COLS}, minmax(0, 1fr))`,
          gridAutoRows: `${GRID_CONSTANTS.CELL_HEIGHT}px`,
        }}
      >
        {/* Placeholder dashed cells during drag / resize */}
        {(resizing !== null || cardDragging !== null) &&
          fillerCells.map((filler) => (
            <div
              key={`widget-filler-${filler.col}-${filler.row}`}
              style={{
                gridColumn: `${filler.col + 1} / span 1`,
                gridRow: `${filler.row + 1} / span 1`,
                minHeight: `${GRID_CONSTANTS.CELL_HEIGHT}px`,
              }}
              className="rounded-xl border border-dashed border-red-500/30 bg-red-500/[0.02] pointer-events-none transition-all"
            />
          ))}

        {/* Placed widget cards */}
        {activeWidgets.map((widget) => {
          const isCurrentDragging = cardDragging?.id === widget.id;
          const isCurrentResizing = resizing?.id === widget.id;
          const currentColSpan = isCurrentResizing && resizing ? resizing.colSpan : widget.colSpan;
          const currentRowSpan = isCurrentResizing && resizing ? resizing.rowSpan : widget.rowSpan;
          const startCol = widget.startCol;
          const startRow = widget.startRow;

          return (
            <div
              key={widget.id}
              onMouseDown={(e) => handleStartCardDrag(e, widget)}
              style={{
                gridColumn: `${startCol + 1} / span ${currentColSpan}`,
                gridRow: `${startRow + 1} / span ${currentRowSpan}`,
              }}
              className={`group relative rounded-xl border transition-colors duration-150 select-none overflow-hidden cursor-grab active:cursor-grabbing ${
                isCurrentDragging
                  ? 'border-red-500/80 shadow-2xl scale-[0.98] bg-[#1a1d28]/60 z-30 ring-2 ring-red-500/30 opacity-50 border-dashed'
                  : isCurrentResizing
                  ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)] bg-[#1c1f2b] z-30'
                  : 'border-slate-800/80 bg-[#16181f]/80 hover:bg-[#1c1f2b] hover:border-slate-700/80 hover:shadow-lg'
              }`}
            >
              {/* Content representation */}
              {widget.render(currentColSpan, currentRowSpan)}

              {/* Size preset toggle pill (Hover top-right) */}
              <button
                type="button"
                data-no-drag="true"
                onClick={() => cycleWidgetSize(widget.id, currentColSpan, currentRowSpan)}
                className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-900/90 hover:bg-red-500/20 text-slate-400 hover:text-red-300 border border-slate-800 hover:border-red-500/40 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                title="Click to cycle card size (1x1, 2x1, 2x2, 4x2, 8x2)"
              >
                {currentColSpan}×{currentRowSpan}
              </button>

              {/* Bottom-right Drag Resize Handle */}
              <div
                onMouseDown={(e) => handleStartResize(e, widget)}
                data-no-drag="true"
                className="resize-handle absolute bottom-0.5 right-0.5 w-5 h-5 cursor-se-resize flex items-center justify-center text-slate-600 hover:text-red-400 opacity-20 group-hover:opacity-100 transition-opacity z-20"
                title="Drag to resize card"
              >
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="text-current">
                  <circle cx="7" cy="7" r="1" fill="currentColor" />
                  <circle cx="7" cy="4" r="1" fill="currentColor" />
                  <circle cx="7" cy="1" r="1" fill="currentColor" />
                  <circle cx="4" cy="7" r="1" fill="currentColor" />
                  <circle cx="4" cy="4" r="1" fill="currentColor" />
                  <circle cx="1" cy="7" r="1" fill="currentColor" />
                </svg>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
