import React, { useState, useRef, useMemo } from 'react';
import { GRID_CONSTANTS, CardPosition, hasOverlap, computePushedLayout, getFillerCells } from '../../../lib/cardGridEngine';
import { UserPreferences, saveUserPreferences } from '../../../lib/userPreferences';
import { QbittorrentStats, SpeedtestResult, ServerNode } from '../../../types';
import { QbittorrentWidget } from './QbittorrentWidget';
import { SpeedtestWidget } from './SpeedtestWidget';
import { TimeWidget } from './TimeWidget';
import { NotesWidget } from './NotesWidget';
import { MultiServerNodesWidget } from './MultiServerNodesWidget';

export interface TopWidgetsGridProps {
  prefs: UserPreferences;
  onUpdatePrefs: (updated: UserPreferences) => void;
  userId?: number;
  uptime?: string;
  speedtest?: SpeedtestResult | null;
  onRunSpeedtest?: () => void;
  isRunningSpeedtest?: boolean;
  qbitStats?: QbittorrentStats | null;
  onOpenInspector?: (type: 'wireguard' | 'pihole' | 'qbittorrent' | 'jellyfin' | 'jellyseerr') => void;
  nodes?: ServerNode[];
  loadingNodes?: boolean;
  isAdmin?: boolean;
  serverGauges?: Record<string, any>;
  onUpdateServerGauges?: (gauges: Record<string, any>) => void;
}

export interface PlacedWidget extends CardPosition {
  id: string;
  startCol: number;
  startRow: number;
  colSpan: number;
  rowSpan: number;
  title: string;
  render: (colSpan: number, rowSpan: number) => React.ReactNode;
}

const REGULAR_PRESETS: Array<{ colSpan: number; rowSpan: number }> = [
  { colSpan: 1, rowSpan: 1 },
  { colSpan: 2, rowSpan: 1 },
  { colSpan: 2, rowSpan: 2 },
  { colSpan: 4, rowSpan: 2 }, // Half width
  { colSpan: 8, rowSpan: 2 }, // Full width
];

const NODES_PRESETS: Array<{ colSpan: number; rowSpan: number }> = [
  { colSpan: 8, rowSpan: 2 }, // Full width
  { colSpan: 4, rowSpan: 2 }, // Half width
  { colSpan: 8, rowSpan: 3 }, // Full tall
  { colSpan: 4, rowSpan: 3 }, // Half tall
];

export function TopWidgetsGrid({
  prefs,
  onUpdatePrefs,
  userId,
  uptime,
  speedtest,
  onRunSpeedtest,
  isRunningSpeedtest,
  qbitStats,
  onOpenInspector,
  nodes,
  loadingNodes = false,
  isAdmin = false,
  serverGauges = {},
  onUpdateServerGauges,
}: TopWidgetsGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const preventClickRef = useRef<boolean>(false);

  const [resizing, setResizing] = useState<{
    id: string;
    colSpan: number;
    rowSpan: number;
  } | null>(null);

  const [cardDragging, setCardDragging] = useState<{
    id: string;
    startCol: number;
    startRow: number;
    colSpan: number;
    rowSpan: number;
  } | null>(null);

  const [livePushedWidgets, setLivePushedWidgets] = useState<PlacedWidget[] | null>(null);
  const livePushedRef = useRef(livePushedWidgets);
  livePushedRef.current = livePushedWidgets;

  // Active widgets list based on permissions and visibility
  const rawWidgets = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      visible: boolean;
      defaultColSpan: number;
      defaultRowSpan: number;
      defaultStartCol: number;
      defaultStartRow: number;
      render: (colSpan: number, rowSpan: number) => React.ReactNode;
    }> = [];

    // 1. Cluster Nodes (Owner/Admin only)
    if (isAdmin) {
      list.push({
        id: 'nodes',
        title: 'Cluster Nodes',
        visible: prefs.widgetVisible?.nodes !== false,
        defaultColSpan: 8,
        defaultRowSpan: 2,
        defaultStartCol: 0,
        defaultStartRow: 0,
        render: (colSpan, rowSpan) => (
          <div className="h-full p-2.5 overflow-hidden">
            <MultiServerNodesWidget
              nodes={nodes || []}
              loading={loadingNodes}
              speedtest={speedtest}
              serverGauges={serverGauges}
              onUpdateServerGauges={onUpdateServerGauges}
              isAdmin={isAdmin}
              onRunSpeedtest={onRunSpeedtest}
              isRunningSpeedtest={isRunningSpeedtest}
              colSpan={colSpan}
              rowSpan={rowSpan}
            />
          </div>
        ),
      });
    }

    // Baseline row offset: if cluster nodes is visible, place widgets underneath by default
    const rowOffset = isAdmin && prefs.widgetVisible?.nodes !== false ? 2 : 0;

    // 2. qBittorrent Widget
    list.push({
      id: 'qbittorrent',
      title: 'qBittorrent',
      visible: prefs.widgetVisible?.qbittorrent !== false && Boolean(qbitStats?.online),
      defaultColSpan: 2,
      defaultRowSpan: 1,
      defaultStartCol: 0,
      defaultStartRow: rowOffset,
      render: (colSpan, rowSpan) => (
        <QbittorrentWidget
          data={qbitStats || null}
          onOpenInspector={() => onOpenInspector?.('qbittorrent')}
          colSpan={colSpan}
          rowSpan={rowSpan}
        />
      ),
    });

    // 3. Speedtest Widget
    list.push({
      id: 'speedtest',
      title: 'Internet Speed',
      visible: prefs.widgetVisible?.speedtest !== false,
      defaultColSpan: 2,
      defaultRowSpan: 1,
      defaultStartCol: 2,
      defaultStartRow: rowOffset,
      render: (colSpan, rowSpan) => (
        <SpeedtestWidget
          speedtest={speedtest}
          onRunSpeedtest={onRunSpeedtest}
          isRunningSpeedtest={isRunningSpeedtest}
          colSpan={colSpan}
          rowSpan={rowSpan}
        />
      ),
    });

    // 4. Time Widget
    list.push({
      id: 'clock',
      title: 'Local Time',
      visible: prefs.widgetVisible?.clock !== false,
      defaultColSpan: 2,
      defaultRowSpan: 1,
      defaultStartCol: 4,
      defaultStartRow: rowOffset,
      render: (colSpan, rowSpan) => (
        <TimeWidget uptime={uptime} colSpan={colSpan} rowSpan={rowSpan} />
      ),
    });

    // 5. Notes Widget
    list.push({
      id: 'notes',
      title: 'Quick Notes',
      visible: prefs.widgetVisible?.notes !== false,
      defaultColSpan: 2,
      defaultRowSpan: 1,
      defaultStartCol: 6,
      defaultStartRow: rowOffset,
      render: (colSpan, rowSpan) => (
        <NotesWidget colSpan={colSpan} rowSpan={rowSpan} />
      ),
    });

    return list.filter((w) => w.visible);
  }, [
    isAdmin,
    prefs.widgetVisible,
    nodes,
    loadingNodes,
    speedtest,
    serverGauges,
    onUpdateServerGauges,
    onRunSpeedtest,
    isRunningSpeedtest,
    qbitStats,
    onOpenInspector,
    uptime,
  ]);

  // Compute placed widgets honoring saved layouts in user preferences
  const placedWidgets: PlacedWidget[] = useMemo(() => {
    const placed: PlacedWidget[] = [];
    const savedLayouts = prefs.widgetLayouts || {};

    for (const w of rawWidgets) {
      const saved = savedLayouts[w.id];
      const colSpan = saved?.colSpan || w.defaultColSpan;
      const rowSpan = saved?.rowSpan || w.defaultRowSpan;

      if (saved && saved.startCol != null && saved.startRow != null) {
        const candidate: PlacedWidget = {
          id: w.id,
          title: w.title,
          startCol: Math.max(0, Math.min(GRID_CONSTANTS.FLAT_COLS - colSpan, saved.startCol)),
          startRow: Math.max(0, saved.startRow),
          colSpan,
          rowSpan,
          render: w.render,
        };
        if (!placed.some((p) => hasOverlap(candidate, p))) {
          placed.push(candidate);
          continue;
        }
      }

      // Default or collision fallback: try default coordinates first
      const defaultCandidate: PlacedWidget = {
        id: w.id,
        title: w.title,
        startCol: Math.max(0, Math.min(GRID_CONSTANTS.FLAT_COLS - colSpan, w.defaultStartCol)),
        startRow: Math.max(0, w.defaultStartRow),
        colSpan,
        rowSpan,
        render: w.render,
      };

      if (!placed.some((p) => hasOverlap(defaultCandidate, p))) {
        placed.push(defaultCandidate);
        continue;
      }

      // Auto-pack into the next free slot
      let r = 0;
      let success = false;
      while (!success && r < GRID_CONSTANTS.MAX_ROWS) {
        for (let c = 0; c <= GRID_CONSTANTS.FLAT_COLS - colSpan; c++) {
          const testCandidate: PlacedWidget = {
            id: w.id,
            title: w.title,
            startCol: c,
            startRow: r,
            colSpan,
            rowSpan,
            render: w.render,
          };
          if (!placed.some((p) => hasOverlap(testCandidate, p))) {
            placed.push(testCandidate);
            success = true;
            break;
          }
        }
        r++;
      }

      if (!success) {
        placed.push({
          id: w.id,
          title: w.title,
          startCol: 0,
          startRow: r,
          colSpan,
          rowSpan,
          render: w.render,
        });
      }
    }

    return placed;
  }, [rawWidgets, prefs.widgetLayouts]);

  const activeWidgets = livePushedWidgets || placedWidgets;

  // Placeholder slots shown when user is dragging or resizing
  const fillerCells = useMemo(() => {
    const isInteracting = resizing !== null || cardDragging !== null;
    return getFillerCells(activeWidgets, GRID_CONSTANTS.FLAT_COLS, isInteracting ? 4 : 2);
  }, [activeWidgets, resizing, cardDragging]);

  if (activeWidgets.length === 0) {
    return null;
  }

  // Preset size cycling
  const cycleWidgetSize = (widgetId: string, currentCols: number, currentRows: number) => {
    const presets = widgetId === 'nodes' ? NODES_PRESETS : REGULAR_PRESETS;
    const currentIndex = presets.findIndex(
      (p) => p.colSpan === currentCols && p.rowSpan === currentRows
    );
    const nextIndex = (currentIndex + 1) % presets.length;
    const nextPreset = presets[nextIndex];

    const currentWidget = placedWidgets.find((w) => w.id === widgetId);
    if (!currentWidget) return;

    const candidate: PlacedWidget = {
      ...currentWidget,
      colSpan: nextPreset.colSpan,
      rowSpan: nextPreset.rowSpan,
      startCol: Math.max(0, Math.min(GRID_CONSTANTS.FLAT_COLS - nextPreset.colSpan, currentWidget.startCol)),
    };

    const pushed = computePushedLayout(candidate, placedWidgets, GRID_CONSTANTS.FLAT_COLS);
    const newLayouts = { ...(prefs.widgetLayouts || {}) };
    for (const item of pushed) {
      newLayouts[item.id] = {
        startCol: item.startCol,
        startRow: item.startRow,
        colSpan: item.colSpan,
        rowSpan: item.rowSpan,
      };
    }

    const updatedPrefs = { ...prefs, widgetLayouts: newLayouts };
    onUpdatePrefs(updatedPrefs);
    saveUserPreferences(userId, updatedPrefs);
  };

  // Drag-and-drop repositioning
  const handleStartCardDrag = (e: React.MouseEvent, widget: PlacedWidget) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('.resize-handle') ||
      target.closest('[data-no-drag]')
    ) {
      return;
    }

    const startX = e.clientX;
    const startY = e.clientY;
    let isDragActive = false;

    const gridRect = gridRef.current ? gridRef.current.getBoundingClientRect() : null;
    const gridWidth = gridRef.current ? gridRef.current.clientWidth : 960;
    const colWidth = (gridWidth - (GRID_CONSTANTS.FLAT_COLS - 1) * GRID_CONSTANTS.GAP) / GRID_CONSTANTS.FLAT_COLS;
    const rowHeight = GRID_CONSTANTS.CELL_HEIGHT + GRID_CONSTANTS.GAP;

    const grabOffsetCol = gridRect ? Math.floor((startX - gridRect.left) / colWidth) - widget.startCol : 0;
    const grabOffsetRow = gridRect ? Math.floor((startY - gridRect.top) / rowHeight) - widget.startRow : 0;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dist = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
      if (!isDragActive) {
        if (dist < 6) return;
        isDragActive = true;
        preventClickRef.current = true;
      }

      if (!gridRef.current) return;
      const currentGridRect = gridRef.current.getBoundingClientRect();
      const currentX = moveEvent.clientX - currentGridRect.left;
      const currentY = moveEvent.clientY - currentGridRect.top;

      const rawCol = Math.floor(currentX / colWidth) - grabOffsetCol;
      const rawRow = Math.floor(currentY / rowHeight) - grabOffsetRow;

      const targetCol = Math.max(0, Math.min(GRID_CONSTANTS.FLAT_COLS - widget.colSpan, rawCol));
      const targetRow = Math.max(0, Math.min(GRID_CONSTANTS.MAX_ROWS - 1, rawRow));

      const candidate: PlacedWidget = {
        ...widget,
        startCol: targetCol,
        startRow: targetRow,
      };

      const pushed = computePushedLayout(candidate, placedWidgets, GRID_CONSTANTS.FLAT_COLS);
      livePushedRef.current = pushed;
      setCardDragging(candidate);
      setLivePushedWidgets(pushed);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      if (isDragActive) {
        const finalLayout = livePushedRef.current;
        if (finalLayout) {
          const updatedLayouts = { ...(prefs.widgetLayouts || {}) };
          for (const item of finalLayout) {
            updatedLayouts[item.id] = {
              startCol: item.startCol,
              startRow: item.startRow,
              colSpan: item.colSpan,
              rowSpan: item.rowSpan,
            };
          }
          const updatedPrefs = { ...prefs, widgetLayouts: updatedLayouts };
          onUpdatePrefs(updatedPrefs);
          saveUserPreferences(userId, updatedPrefs);
        }

        preventClickRef.current = true;
        setTimeout(() => {
          preventClickRef.current = false;
        }, 150);
      } else {
        preventClickRef.current = false;
      }

      livePushedRef.current = null;
      setCardDragging(null);
      setLivePushedWidgets(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Drag resize handler
  const handleStartResize = (e: React.MouseEvent, widget: PlacedWidget) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const initialCols = widget.colSpan;
    const initialRows = widget.rowSpan;
    const gridWidth = gridRef.current ? gridRef.current.clientWidth : 960;
    const colWidth = (gridWidth - (GRID_CONSTANTS.FLAT_COLS - 1) * GRID_CONSTANTS.GAP) / GRID_CONSTANTS.FLAT_COLS;
    const rowHeight = GRID_CONSTANTS.CELL_HEIGHT + GRID_CONSTANTS.GAP;

    setResizing({ id: widget.id, colSpan: initialCols, rowSpan: initialRows });

    let finalCols = initialCols;
    let finalRows = initialRows;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      const colStep = Math.round(deltaX / (colWidth * 0.45));
      const rowStep = Math.round(deltaY / (rowHeight * 0.45));

      const candidateCols = Math.max(1, Math.min(GRID_CONSTANTS.FLAT_COLS - widget.startCol, initialCols + colStep));
      const candidateRows = Math.max(1, Math.min(4, initialRows + rowStep));

      finalCols = candidateCols;
      finalRows = candidateRows;

      setResizing({ id: widget.id, colSpan: candidateCols, rowSpan: candidateRows });

      const candidate: PlacedWidget = {
        ...widget,
        colSpan: candidateCols,
        rowSpan: candidateRows,
      };
      const pushed = computePushedLayout(candidate, placedWidgets, GRID_CONSTANTS.FLAT_COLS);
      livePushedRef.current = pushed;
      setLivePushedWidgets(pushed);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setResizing(null);

      const finalLayout = livePushedRef.current || placedWidgets;
      const updatedLayouts = { ...(prefs.widgetLayouts || {}) };
      for (const item of finalLayout) {
        updatedLayouts[item.id] = {
          startCol: item.startCol,
          startRow: item.startRow,
          colSpan: item.id === widget.id ? finalCols : item.colSpan,
          rowSpan: item.id === widget.id ? finalRows : item.rowSpan,
        };
      }

      const updatedPrefs = { ...prefs, widgetLayouts: updatedLayouts };
      onUpdatePrefs(updatedPrefs);
      saveUserPreferences(userId, updatedPrefs);
      setLivePushedWidgets(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

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
                title="Click to cycle card size (Half width 4x2, Full width 8x2, 2x1, 1x1)"
              >
                {currentColSpan}×{currentRowSpan}
              </button>

              {/* Bottom-right Drag Resize Handle */}
              <div
                onMouseDown={(e) => handleStartResize(e, widget)}
                data-no-drag="true"
                className="resize-handle absolute bottom-0.5 right-0.5 w-5 h-5 cursor-se-resize flex items-center justify-center text-slate-600 hover:text-red-400 opacity-20 group-hover:opacity-100 transition-opacity z-20"
                title="Drag to resize widget"
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
