import React, { useState, useRef, useMemo } from 'react';
import { GRID_CONSTANTS } from '../../../lib/cardGridEngine';
import { UserPreferences, saveUserPreferences } from '../../../lib/userPreferences';
import { QbittorrentStats, SpeedtestResult } from '../../../types';
import { QbittorrentWidget } from './QbittorrentWidget';
import { SpeedtestWidget } from './SpeedtestWidget';
import { TimeWidget } from './TimeWidget';
import { NotesWidget } from './NotesWidget';

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
}

interface WidgetItem {
  id: 'clock' | 'speedtest' | 'qbittorrent' | 'notes';
  title: string;
  visible: boolean;
  defaultColSpan: number;
  defaultRowSpan: number;
  render: (colSpan: number, rowSpan: number) => React.ReactNode;
}

const SIZE_PRESETS: Array<{ colSpan: number; rowSpan: number }> = [
  { colSpan: 1, rowSpan: 1 },
  { colSpan: 2, rowSpan: 1 },
  { colSpan: 2, rowSpan: 2 },
  { colSpan: 4, rowSpan: 2 },
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
}: TopWidgetsGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  const [resizing, setResizing] = useState<{
    id: string;
    colSpan: number;
    rowSpan: number;
  } | null>(null);

  // Widget definitions
  const widgets: WidgetItem[] = useMemo(() => {
    return [
      {
        id: 'clock',
        title: 'Local Time',
        visible: prefs.widgetVisible?.clock !== false,
        defaultColSpan: 2,
        defaultRowSpan: 1,
        render: (colSpan, rowSpan) => (
          <TimeWidget uptime={uptime} colSpan={colSpan} rowSpan={rowSpan} />
        ),
      },
      {
        id: 'speedtest',
        title: 'Internet Speed',
        visible: prefs.widgetVisible?.speedtest !== false,
        defaultColSpan: 2,
        defaultRowSpan: 1,
        render: (colSpan, rowSpan) => (
          <SpeedtestWidget
            speedtest={speedtest}
            onRunSpeedtest={onRunSpeedtest}
            isRunningSpeedtest={isRunningSpeedtest}
            colSpan={colSpan}
            rowSpan={rowSpan}
          />
        ),
      },
      {
        id: 'qbittorrent',
        title: 'qBittorrent',
        visible: prefs.widgetVisible?.qbittorrent !== false && Boolean(qbitStats?.online),
        defaultColSpan: 2,
        defaultRowSpan: 1,
        render: (colSpan, rowSpan) => (
          <QbittorrentWidget
            data={qbitStats || null}
            onOpenInspector={() => onOpenInspector?.('qbittorrent')}
            colSpan={colSpan}
            rowSpan={rowSpan}
          />
        ),
      },
      {
        id: 'notes',
        title: 'Quick Notes',
        visible: prefs.widgetVisible?.notes !== false,
        defaultColSpan: 2,
        defaultRowSpan: 1,
        render: (colSpan, rowSpan) => (
          <NotesWidget colSpan={colSpan} rowSpan={rowSpan} />
        ),
      },
    ];
  }, [prefs.widgetVisible, uptime, speedtest, onRunSpeedtest, isRunningSpeedtest, qbitStats, onOpenInspector]);

  const activeWidgets = widgets.filter((w) => w.visible);

  if (activeWidgets.length === 0) {
    return null;
  }

  // Get current size for a widget
  const getWidgetSize = (widgetId: string, defaultCols: number, defaultRows: number) => {
    const saved = prefs.widgetSizes?.[widgetId];
    if (saved && saved.colSpan && saved.rowSpan) {
      return saved;
    }
    return { colSpan: defaultCols, rowSpan: defaultRows };
  };

  // Cycle preset sizes (1x1 -> 2x1 -> 2x2 -> 4x2 -> 1x1)
  const cycleWidgetSize = (widgetId: string, currentCols: number, currentRows: number) => {
    const currentIndex = SIZE_PRESETS.findIndex(
      (p) => p.colSpan === currentCols && p.rowSpan === currentRows
    );
    const nextIndex = (currentIndex + 1) % SIZE_PRESETS.length;
    const nextPreset = SIZE_PRESETS[nextIndex];

    const updatedSizes = {
      ...(prefs.widgetSizes || {}),
      [widgetId]: nextPreset,
    };
    const updatedPrefs = { ...prefs, widgetSizes: updatedSizes };
    onUpdatePrefs(updatedPrefs);
    saveUserPreferences(userId, updatedPrefs);
  };

  // Drag resize handler
  const handleStartResize = (e: React.MouseEvent, widgetId: string, initialCols: number, initialRows: number) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const gridWidth = gridRef.current ? gridRef.current.clientWidth : 960;
    const colWidth = (gridWidth - (GRID_CONSTANTS.FLAT_COLS - 1) * GRID_CONSTANTS.GAP) / GRID_CONSTANTS.FLAT_COLS;
    const rowHeight = GRID_CONSTANTS.CELL_HEIGHT;

    setResizing({ id: widgetId, colSpan: initialCols, rowSpan: initialRows });

    let finalCols = initialCols;
    let finalRows = initialRows;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      const colStep = Math.round(deltaX / (colWidth * 0.5));
      const rowStep = Math.round(deltaY / (rowHeight * 0.5));

      const candidateCols = Math.max(1, Math.min(GRID_CONSTANTS.FLAT_COLS, initialCols + colStep));
      const candidateRows = Math.max(1, Math.min(3, initialRows + rowStep));

      finalCols = candidateCols;
      finalRows = candidateRows;

      setResizing({ id: widgetId, colSpan: candidateCols, rowSpan: candidateRows });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setResizing(null);

      const updatedSizes = {
        ...(prefs.widgetSizes || {}),
        [widgetId]: { colSpan: finalCols, rowSpan: finalRows },
      };
      const updatedPrefs = { ...prefs, widgetSizes: updatedSizes };
      onUpdatePrefs(updatedPrefs);
      saveUserPreferences(userId, updatedPrefs);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="w-full overflow-x-auto pb-1">
      <div
        ref={gridRef}
        className="grid gap-2.5 relative select-none min-w-[700px] xl:min-w-0"
        style={{
          gridTemplateColumns: `repeat(${GRID_CONSTANTS.FLAT_COLS}, minmax(0, 1fr))`,
          gridAutoRows: `${GRID_CONSTANTS.CELL_HEIGHT}px`,
        }}
      >
        {activeWidgets.map((widget) => {
          const isCurrentResizing = resizing?.id === widget.id;
          const { colSpan: baseCols, rowSpan: baseRows } = getWidgetSize(
            widget.id,
            widget.defaultColSpan,
            widget.defaultRowSpan
          );
          const currentColSpan = isCurrentResizing && resizing ? resizing.colSpan : baseCols;
          const currentRowSpan = isCurrentResizing && resizing ? resizing.rowSpan : baseRows;

          return (
            <div
              key={widget.id}
              style={{
                gridColumn: `span ${currentColSpan}`,
                gridRow: `span ${currentRowSpan}`,
              }}
              className={`group relative rounded-xl border transition-all duration-150 select-none overflow-hidden ${
                isCurrentResizing
                  ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)] bg-[#1c1f2b] z-30 cursor-se-resize'
                  : 'border-slate-800/80 bg-[#16181f]/80 hover:bg-[#1c1f2b] hover:border-slate-700/80 hover:shadow-lg'
              }`}
            >
              {/* Content representation */}
              {widget.render(currentColSpan, currentRowSpan)}

              {/* Size preset toggle pill (Hover top-right) */}
              <button
                type="button"
                onClick={() => cycleWidgetSize(widget.id, currentColSpan, currentRowSpan)}
                className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-900/90 hover:bg-red-500/20 text-slate-400 hover:text-red-300 border border-slate-800 hover:border-red-500/40 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                title="Click to cycle card size (1x1, 2x1, 2x2, 4x2)"
              >
                {currentColSpan}×{currentRowSpan}
              </button>

              {/* Bottom-right Drag Resize Handle */}
              <div
                onMouseDown={(e) => handleStartResize(e, widget.id, currentColSpan, currentRowSpan)}
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
