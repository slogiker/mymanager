import React, { useRef, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { BOARD, boardSpanStyle } from './boardGrid';

export interface SortableWidgetColumnProps {
  id: string;
  title: string;
  icon?: React.ReactNode;
  colSpan: number;
  rowSpan: number;
  boardCols: number;
  canResize?: boolean;
  onSetSize?: (colSpan: number, rowSpan: number) => void;
  /** Renders widget content for a given (possibly live-previewed) size */
  renderContent: (colSpan: number, rowSpan: number) => React.ReactNode;
}

const clamp = (v: number, max: number) => Math.max(1, Math.min(max, v));

export function SortableWidgetColumn({
  id,
  colSpan,
  rowSpan,
  boardCols,
  canResize = true,
  onSetSize,
  renderContent,
}: SortableWidgetColumnProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [resizing, setResizing] = useState<{ c: number; r: number } | null>(null);

  const c = clamp(resizing ? resizing.c : colSpan, boardCols);
  const r = resizing ? resizing.r : rowSpan;

  // Same behaviour as service cards: drag the bottom-right corner to snap width and height to board cells
  const handleStartResize = (e: React.MouseEvent) => {
    if (!onSetSize || !boxRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const startCols = c;
    const colWidth = (boxRef.current.getBoundingClientRect().width + BOARD.GAP) / startCols;
    const rowHeight = BOARD.CELL_HEIGHT + BOARD.GAP;
    let current = { c: startCols, r: rowSpan };
    setResizing(current);

    const handleMouseMove = (ev: MouseEvent) => {
      const colStep = Math.round((ev.clientX - startX) / (colWidth * 0.45));
      const rowStep = Math.round((ev.clientY - startY) / (rowHeight * 0.45));
      const next = { c: clamp(startCols + colStep, boardCols), r: clamp(rowSpan + rowStep, BOARD.MAX_ROWS) };
      if (next.c !== current.c || next.r !== current.r) {
        current = next;
        setResizing(next);
      }
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setResizing(null);
      if (current.c !== startCols || current.r !== rowSpan) onSetSize(current.c, current.r);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      ref={(el) => {
        setNodeRef(el);
        boxRef.current = el;
      }}
      style={{ ...boardSpanStyle(c, r, boardCols), transform: CSS.Transform.toString(transform), transition }}
      data-board-widget={id}
      className={`group/widget relative min-w-0 rounded-2xl border p-3 shadow-md overflow-hidden transition-colors duration-150 ${
        isDragging
          ? 'opacity-40 z-30 border-red-500/80 border-dashed ring-2 ring-red-500/30 bg-[#1a1d28]/60'
          : resizing
          ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)] bg-[#1c1f2b] z-30 cursor-se-resize'
          : 'border-slate-800/80 bg-[#16181f]/80 hover:bg-[#1c1f2b] hover:border-slate-700/80 hover:shadow-lg'
      }`}
    >
      {/* Drag grip */}
      <button
        {...attributes}
        {...listeners}
        data-no-drag="true"
        className="absolute top-2 right-2 z-20 cursor-grab active:cursor-grabbing p-1 text-slate-500 hover:text-slate-300 bg-slate-900/90 rounded-lg border border-slate-700/60 opacity-0 group-hover/widget:opacity-100 transition-opacity"
        title="Drag widget to rearrange board"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>

      <div className="h-full w-full overflow-y-auto scrollbar-thin">{renderContent(c, r)}</div>

      {/* Bottom-right corner resize handle: identical to service cards */}
      {canResize && onSetSize && (
        <div
          onMouseDown={handleStartResize}
          className="resize-handle absolute bottom-1 right-1 w-4 h-4 text-slate-600 hover:text-red-400 cursor-se-resize opacity-0 group-hover/widget:opacity-100 transition-opacity flex items-center justify-center z-20"
          title="Drag to resize widget width and height"
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
      )}
    </div>
  );
}
