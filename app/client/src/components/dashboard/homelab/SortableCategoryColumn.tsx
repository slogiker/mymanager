import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Plus,
  ExternalLink,
  Lock,
  Edit2,
  Trash2,
  Copy,
  Check,
  Activity,
  Shield,
  ChevronRight,
} from 'lucide-react';
import { Service } from '../../../types';
import {
  GRID_CONSTANTS,
  CardPosition,
  layoutCategoryCards,
  getFillerCells,
  computePushedLayout,
} from '../../../lib/cardGridEngine';
import { ServiceIcon } from '../common/ServiceIcon';

export interface SortableCategoryColumnProps {
  id: string;
  category: string;
  items: Service[];
  colSpan?: 1 | 2;
  vpnConnected?: boolean;
  onVpnLockedClick?: (title: string, url: string) => void;
  isOwner?: boolean;
  onRename: (oldName: string) => void;
  onAddService: (cat: string) => void;
  onEditService: (s: Service) => void;
  onDeleteService: (id: number) => void;
  onUpdateCardLayout?: (updates: Array<{ id: number; start_col: number; start_row: number; col_span: number; row_span: number }>) => void;
  onOpenInspector?: (type: 'wireguard' | 'pihole' | 'qbittorrent' | 'jellyfin' | 'jellyseerr') => void;
  onMoveCardCategory?: (serviceId: number, fromCategory: string, toCategory: string) => void;
}

export function SortableCategoryColumn({
  id,
  category,
  items,
  colSpan = 1,
  vpnConnected,
  onVpnLockedClick,
  isOwner = true,
  onRename,
  onAddService,
  onEditService,
  onDeleteService,
  onUpdateCardLayout,
  onOpenInspector,
  onMoveCardCategory,
}: SortableCategoryColumnProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const [isDropTargetHovered, setIsDropTargetHovered] = useState<boolean>(false);
  const [dragFloating, setDragFloating] = useState<{
    card: Service & CardPosition;
    x: number;
    y: number;
    targetCategory: string | null;
  } | null>(null);

  useEffect(() => {
    const handleDragOverCat = (e: Event) => {
      const catName = (e as CustomEvent).detail;
      setIsDropTargetHovered(catName === category);
    };
    window.addEventListener('card_drag_over_category', handleDragOverCat);
    return () => window.removeEventListener('card_drag_over_category', handleDragOverCat);
  }, [category]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.6 : 1,
  };

  const [copiedUrlId, setCopiedUrlId] = useState<number | null>(null);

  const handleCopy = (e: React.MouseEvent, s: Service) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(s.url);
    setCopiedUrlId(s.id);
    setTimeout(() => setCopiedUrlId(null), 1500);
  };

  // Compute placed cards in the category mini-grid
  const placedCards = useMemo(() => {
    return layoutCategoryCards(items, GRID_CONSTANTS.COLS);
  }, [items]);

  // Live pushed cards state during dragging
  const [livePushedCards, setLivePushedCards] = useState<(Service & CardPosition)[] | null>(null);
  const livePushedCardsRef = useRef(livePushedCards);
  livePushedCardsRef.current = livePushedCards;

  const activeCards = livePushedCards || placedCards;

  // Resizing state
  const [resizing, setResizing] = useState<{
    id: number;
    startCol: number;
    startRow: number;
    colSpan: number;
    rowSpan: number;
  } | null>(null);
  const resizingRef = useRef(resizing);
  resizingRef.current = resizing;
  const gridRef = useRef<HTMLDivElement>(null);

  // Prevent card click navigation during or immediately after resize/drag
  const preventClickRef = useRef<boolean>(false);

  // Card Dragging state
  const [cardDragging, setCardDragging] = useState<{
    id: number;
    startCol: number;
    startRow: number;
    colSpan: number;
    rowSpan: number;
  } | null>(null);

  // Compute filler placeholder cells for unoccupied slots
  const fillerCells = useMemo(() => {
    const isInteracting = resizing !== null || cardDragging !== null;
    return getFillerCells(activeCards, GRID_CONSTANTS.COLS, isInteracting ? 3 : 2);
  }, [activeCards, resizing, cardDragging]);

  const handleStartCardDrag = (e: React.MouseEvent, card: Service & CardPosition) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('.resize-handle') ||
      target.closest('[data-no-drag]')
    ) {
      return;
    }

    const startX = e.clientX;
    const startY = e.clientY;
    let isDragActive = false;

    const gridRect = gridRef.current ? gridRef.current.getBoundingClientRect() : null;
    const gridWidth = gridRef.current ? gridRef.current.clientWidth : 320;
    const colWidth = (gridWidth - GRID_CONSTANTS.GAP) / GRID_CONSTANTS.COLS;
    const rowHeight = GRID_CONSTANTS.CELL_HEIGHT + GRID_CONSTANTS.GAP;

    const grabOffsetCol = gridRect ? Math.floor((startX - gridRect.left) / colWidth) - card.startCol : 0;
    const grabOffsetRow = gridRect ? Math.floor((startY - gridRect.top) / rowHeight) - card.startRow : 0;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dist = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
      if (!isDragActive) {
        if (dist < 6) return;
        isDragActive = true;
        preventClickRef.current = true;
      }

      // Check which category column we are hovering over
      const elem = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
      const targetColElem = elem?.closest('[data-category-column]');
      const overCat = targetColElem?.getAttribute('data-category-column') || null;
      const targetCat = overCat && overCat !== category ? overCat : null;

      setDragFloating({
        card,
        x: moveEvent.clientX,
        y: moveEvent.clientY,
        targetCategory: targetCat,
      });

      window.dispatchEvent(new CustomEvent('card_drag_over_category', { detail: targetCat }));

      if (!targetCat) {
        if (!gridRef.current) return;
        const currentGridRect = gridRef.current.getBoundingClientRect();
        const currentX = moveEvent.clientX - currentGridRect.left;
        const currentY = moveEvent.clientY - currentGridRect.top;

        const rawCol = Math.floor(currentX / colWidth) - grabOffsetCol;
        const rawRow = Math.floor(currentY / rowHeight) - grabOffsetRow;

        const targetCol = Math.max(0, Math.min(GRID_CONSTANTS.COLS - card.colSpan, rawCol));
        const targetRow = Math.max(0, Math.min(GRID_CONSTANTS.MAX_ROWS - 1, rawRow));

        const candidate: CardPosition = {
          id: card.id,
          startCol: targetCol,
          startRow: targetRow,
          colSpan: card.colSpan,
          rowSpan: card.rowSpan,
        };

        const pushedLayout = computePushedLayout(candidate, placedCards, GRID_CONSTANTS.COLS);
        livePushedCardsRef.current = pushedLayout;
        setCardDragging(candidate);
        setLivePushedCards(pushedLayout);
      } else {
        livePushedCardsRef.current = null;
        setCardDragging(null);
        setLivePushedCards(null);
      }
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.dispatchEvent(new CustomEvent('card_drag_over_category', { detail: null }));

      setDragFloating(null);

      if (isDragActive) {
        const dropElem = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
        const targetColElem = dropElem?.closest('[data-category-column]');
        const targetCategory = targetColElem?.getAttribute('data-category-column') || null;

        if (targetCategory && targetCategory !== category) {
          onMoveCardCategory?.(card.id, category, targetCategory);
        } else {
          const finalLayout = livePushedCardsRef.current;
          if (finalLayout && onUpdateCardLayout) {
            const changedCards: Array<{
              id: number;
              start_col: number;
              start_row: number;
              col_span: number;
              row_span: number;
            }> = [];

            for (const item of finalLayout) {
              const original = placedCards.find((c) => c.id === item.id);
              if (
                !original ||
                original.startCol !== item.startCol ||
                original.startRow !== item.startRow ||
                original.colSpan !== item.colSpan ||
                original.rowSpan !== item.rowSpan
              ) {
                changedCards.push({
                  id: item.id,
                  start_col: item.startCol,
                  start_row: item.startRow,
                  col_span: item.colSpan,
                  row_span: item.rowSpan,
                });
              }
            }

            if (changedCards.length > 0) {
              onUpdateCardLayout(changedCards);
            }
          }
        }

        preventClickRef.current = true;
        setTimeout(() => {
          preventClickRef.current = false;
        }, 150);
      } else {
        preventClickRef.current = false;
      }

      livePushedCardsRef.current = null;
      setCardDragging(null);
      setLivePushedCards(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleStartResize = (
    e: React.MouseEvent,
    card: Service & CardPosition,
    direction: 'se' | 'top' = 'se'
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const initialColSpan = card.colSpan;
    const initialRowSpan = card.rowSpan;
    const initialStartCol = card.startCol;
    const initialStartRow = card.startRow;
    const gridWidth = gridRef.current ? gridRef.current.clientWidth : 320;
    const colWidth = (gridWidth - GRID_CONSTANTS.GAP) / GRID_CONSTANTS.COLS;
    const rowHeight = GRID_CONSTANTS.CELL_HEIGHT;

    const initialCandidate: CardPosition = {
      id: card.id,
      startCol: initialStartCol,
      startRow: initialStartRow,
      colSpan: initialColSpan,
      rowSpan: initialRowSpan,
    };
    setResizing(initialCandidate);
    setLivePushedCards(null);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      preventClickRef.current = true;
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      let candidateStartCol = initialStartCol;
      let candidateStartRow = initialStartRow;
      let candidateColSpan = initialColSpan;
      let candidateRowSpan = initialRowSpan;

      if (direction === 'top') {
        const rowStep = Math.round(-deltaY / (rowHeight * 0.45));
        if (rowStep > 0) {
          const maxUp = Math.min(initialStartRow, 3 - initialRowSpan);
          const actualUp = Math.max(0, Math.min(maxUp, rowStep));
          candidateStartRow = initialStartRow - actualUp;
          candidateRowSpan = initialRowSpan + actualUp;
        } else if (rowStep < 0) {
          const maxDown = initialRowSpan - 1;
          const actualDown = Math.max(0, Math.min(maxDown, -rowStep));
          candidateStartRow = initialStartRow + actualDown;
          candidateRowSpan = initialRowSpan - actualDown;
        }
      } else {
        const colStep = Math.round(deltaX / (colWidth * 0.45));
        const rowStep = Math.round(deltaY / (rowHeight * 0.45));

        candidateColSpan = Math.max(1, Math.min(GRID_CONSTANTS.COLS, initialColSpan + colStep));
        candidateStartCol = candidateColSpan >= GRID_CONSTANTS.COLS ? 0 : initialStartCol;

        if (initialRowSpan + rowStep >= 1) {
          candidateRowSpan = Math.max(1, Math.min(3, initialRowSpan + rowStep));
          candidateStartRow = initialStartRow;
        } else {
          const excessUp = 1 - (initialRowSpan + rowStep);
          const maxUp = Math.min(initialStartRow, 2);
          const actualUp = Math.min(maxUp, excessUp);
          candidateStartRow = initialStartRow - actualUp;
          candidateRowSpan = Math.min(3, 1 + actualUp);
        }
      }

      const candidate: CardPosition = {
        id: card.id,
        startCol: candidateStartCol,
        startRow: candidateStartRow,
        colSpan: candidateColSpan,
        rowSpan: candidateRowSpan,
      };

      // Real-time layout computation pushing colliding cards down into new rows
      const pushedLayout = computePushedLayout(candidate, placedCards, GRID_CONSTANTS.COLS);
      livePushedCardsRef.current = pushedLayout;
      setResizing(candidate);
      setLivePushedCards(pushedLayout);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      preventClickRef.current = true;
      setTimeout(() => {
        preventClickRef.current = false;
      }, 150);

      const finalLayout = livePushedCardsRef.current;
      if (finalLayout && onUpdateCardLayout) {
        const changedCards: Array<{
          id: number;
          start_col: number;
          start_row: number;
          col_span: number;
          row_span: number;
        }> = [];

        for (const item of finalLayout) {
          const original = placedCards.find((c) => c.id === item.id);
          if (
            !original ||
            original.startCol !== item.startCol ||
            original.startRow !== item.startRow ||
            original.colSpan !== item.colSpan ||
            original.rowSpan !== item.rowSpan
          ) {
            changedCards.push({
              id: item.id,
              start_col: item.startCol,
              start_row: item.startRow,
              col_span: item.colSpan,
              row_span: item.rowSpan,
            });
          }
        }

        if (changedCards.length > 0) {
          onUpdateCardLayout(changedCards);
        }
      }
      livePushedCardsRef.current = null;
      setResizing(null);
      setLivePushedCards(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-category-column={category}
      className={`group/col relative p-1.5 transition-all duration-200 flex flex-col space-y-3 rounded-2xl ${
        colSpan === 2 ? 'col-span-1 md:col-span-2' : 'col-span-1'
      } ${
        isDropTargetHovered
          ? 'ring-2 ring-red-500 bg-red-500/10 shadow-[0_0_30px_rgba(239,68,68,0.25)] border border-red-500/40'
          : 'border border-transparent'
      }`}
    >
      {/* Category Drop Indicator Banner */}
      {isDropTargetHovered && (
        <div className="mx-1 px-3 py-2 rounded-xl border border-dashed border-red-500 bg-red-500/20 text-red-300 font-bold text-xs flex items-center justify-center gap-2 animate-pulse shadow-lg">
          <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
          <span>Drop card here to move into {category}</span>
        </div>
      )}

      {/* Category Header */}
      <div className="flex items-center justify-between pb-1 px-1">
        <div className="flex items-center gap-2 min-w-0">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 text-slate-600 hover:text-slate-300 rounded transition-colors"
            title="Drag category to rearrange"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          {isOwner ? (
            <button
              onClick={() => onRename(category)}
              className="font-bold text-xs uppercase tracking-wider text-slate-300 hover:text-red-400 transition-colors truncate text-left flex items-center gap-1.5"
              title="Click to rename category"
            >
              <span>{category}</span>
              <Edit2 className="w-3 h-3 text-slate-600 opacity-60 hover:opacity-100" />
            </button>
          ) : (
            <span className="font-bold text-xs uppercase tracking-wider text-slate-300 truncate">
              {category}
            </span>
          )}
          <span className="text-[10px] font-mono text-slate-500">({items.length})</span>
        </div>

        {isOwner && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onAddService(category)}
              className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Add service to this category"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Freeform Category Mini-Grid */}
      <div
        ref={gridRef}
        className="grid grid-cols-2 gap-2.5 relative select-none"
        style={{
          gridAutoRows: `${GRID_CONSTANTS.CELL_HEIGHT}px`,
        }}
      >
        {/* Grid Slots Outline (Shown when user is actively resizing or dragging) */}
        {(resizing !== null || cardDragging !== null || isDropTargetHovered) && fillerCells.map((filler) => (
          <div
            key={`filler-${filler.col}-${filler.row}`}
            style={{
              gridColumn: `${filler.col + 1} / span 1`,
              gridRow: `${filler.row + 1} / span 1`,
              minHeight: `${GRID_CONSTANTS.CELL_HEIGHT}px`,
            }}
            className="rounded-xl border border-dashed border-red-500/30 bg-red-500/[0.03] pointer-events-none transition-all"
          />
        ))}

        {/* Placed Service Cards */}
        {activeCards.map((s) => {
          const isCurrentDragging = cardDragging?.id === s.id;
          const isCurrentResizing = resizing?.id === s.id;
          const currentColSpan = isCurrentResizing && resizing ? resizing.colSpan : s.colSpan;
          const currentRowSpan = isCurrentResizing && resizing ? resizing.rowSpan : s.rowSpan;
          const startCol = s.startCol;
          const startRow = s.startRow;

          const isOnline = s.status === 'online';
          const isOffline = s.status === 'offline' || s.status === 'timeout';
          const isCompact = currentColSpan === 1 && currentRowSpan === 1;

          const isVpnRequired = Boolean(
            s.requires_vpn ||
            (s.url && (s.url.includes('.home.arpa') || s.url.includes('192.168.1.') || s.url.includes('10.7.235.')))
          );
          const isVpnLocked = isVpnRequired && vpnConnected === false;

          return (
            <div
              key={s.id}
              onMouseDown={(e) => isOwner && handleStartCardDrag(e, s)}
              onClick={(e) => {
                if (preventClickRef.current) {
                  e.preventDefault();
                  e.stopPropagation();
                  return;
                }
                if (isVpnLocked) {
                  onVpnLockedClick?.(s.title, s.url);
                  return;
                }
                if (s.url === '#' || !s.url) {
                  if (s.telemetryType && onOpenInspector) {
                    onOpenInspector(s.telemetryType);
                  }
                } else {
                  window.open(s.url, '_blank', 'noopener,noreferrer');
                }
              }}
              role="link"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (isVpnLocked) {
                    onVpnLockedClick?.(s.title, s.url);
                    return;
                  }
                  if (s.url === '#' || !s.url) {
                    if (s.telemetryType && onOpenInspector) onOpenInspector(s.telemetryType);
                  } else {
                    window.open(s.url, '_blank', 'noopener,noreferrer');
                  }
                }
              }}
              style={{
                gridColumn: `${startCol + 1} / span ${currentColSpan}`,
                gridRow: `${startRow + 1} / span ${currentRowSpan}`,
              }}
              className={`group relative rounded-xl border transition-colors duration-150 select-none overflow-hidden ${
                isCurrentDragging || dragFloating?.card.id === s.id
                  ? 'border-red-500/80 shadow-2xl scale-[0.98] bg-[#1a1d28]/60 z-20 cursor-grabbing ring-2 ring-red-500/30 opacity-40 border-dashed'
                  : isCurrentResizing
                  ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)] bg-[#1c1f2b] z-30 cursor-se-resize'
                  : isVpnLocked
                  ? 'border-amber-500/30 bg-[#16181f]/60 opacity-60 hover:opacity-85 hover:border-amber-500/50 hover:shadow-lg cursor-pointer'
                  : 'border-slate-800/80 bg-[#16181f]/80 hover:bg-[#1c1f2b] hover:border-slate-700/80 hover:shadow-lg cursor-pointer'
              } ${isCompact ? 'p-2.5 flex flex-col justify-between' : 'p-3.5 flex items-center justify-between'}`}
            >
              {isCompact ? (
                /* Compact 1x1 Card */
                <>
                  <div className="flex items-center gap-2 min-w-0 pr-4">
                    <ServiceIcon icon={s.icon} title={s.title} />
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-100 group-hover:text-red-400 transition-colors truncate flex items-center gap-1">
                        <span className="truncate">{s.title}</span>
                        {isVpnLocked && <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 truncate block mt-0.5">
                        {s.url.replace(/^https?:\/\//, '')}
                      </span>
                    </div>
                  </div>

                  {/* Hover Quick Action Buttons on Compact 1x1 Card */}
                  <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 bg-[#16181f]/95 p-0.5 rounded-lg border border-slate-700/80 shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                      type="button"
                      onClick={(e) => handleCopy(e, s)}
                      className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                      title="Copy URL"
                    >
                      {copiedUrlId === s.id ? (
                        <Check className="w-2.5 h-2.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-2.5 h-2.5" />
                      )}
                    </button>
                    {isOwner && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onEditService(s);
                          }}
                          className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                          title="Edit service"
                        >
                          <Edit2 className="w-2.5 h-2.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDeleteService(s.id);
                          }}
                          className="p-1 text-slate-400 hover:text-red-400 rounded hover:bg-slate-800 transition-colors"
                          title="Remove service"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/40 text-[9px] font-mono">
                    <span
                      className={`flex items-center gap-1 ${
                        isOnline ? 'text-emerald-400' : isOffline ? 'text-rose-400' : 'text-slate-500'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isOnline ? 'bg-emerald-400 animate-pulse' : isOffline ? 'bg-rose-500' : 'bg-slate-500'
                        }`}
                      />
                      {s.status || 'ping'}
                    </span>
                    <div className="flex items-center gap-1">
                      {s.telemetryType && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onOpenInspector?.(s.telemetryType!);
                          }}
                          className="p-0.5 text-slate-400 hover:text-emerald-400 transition-colors"
                          title="Open live telemetry inspector"
                        >
                          <Activity className="w-3 h-3 text-emerald-400" />
                        </button>
                      )}
                      {isVpnLocked ? (
                        <span className="inline-flex items-center gap-0.5 text-amber-400 font-mono font-bold" title="WireGuard VPN or LAN required">
                          <Lock className="w-2.5 h-2.5" />
                          VPN
                        </span>
                      ) : (
                        s.requires_vpn && <span className="text-purple-400 font-bold">VPN</span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                /* Wide 2x1 or Multi-row Card */
                <>
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <ServiceIcon icon={s.icon} title={s.title} />
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-slate-100 group-hover:text-red-400 transition-colors truncate flex items-center gap-1.5">
                        <span>{s.title}</span>
                        {isVpnLocked ? (
                          <Lock className="w-3 h-3 text-amber-400 shrink-0" title="WireGuard VPN or LAN required to access this service" />
                        ) : (
                          <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-500 truncate block mt-0.5">
                        {s.url.replace(/^https?:\/\//, '')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isVpnLocked ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30" title="Connect to WireGuard VPN to access this hostname">
                        <Lock className="w-2.5 h-2.5 text-amber-400" />
                        VPN Locked
                      </span>
                    ) : s.requires_vpn ? (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        <Shield className="w-2.5 h-2.5 text-purple-400" />
                        VPN
                      </span>
                    ) : null}

                    <div
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider border ${
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
                            onOpenInspector?.(s.telemetryType!);
                          }}
                          className="p-1 text-slate-400 hover:text-emerald-400 rounded hover:bg-slate-800 transition-colors"
                          title="Inspect live telemetry"
                        >
                          <Activity className="w-3 h-3 text-emerald-400" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleCopy(e, s)}
                        className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                        title="Copy URL"
                      >
                        {copiedUrlId === s.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onEditService(s);
                        }}
                        className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                        title="Edit service"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onDeleteService(s.id);
                        }}
                        className="p-1 text-slate-400 hover:text-red-400 rounded hover:bg-slate-800 transition-colors"
                        title="Remove service"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Resize indicator badge when dragging */}
              {isCurrentResizing && (
                <span className="absolute top-1 right-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40">
                  {currentColSpan}×{currentRowSpan}
                </span>
              )}

              {/* Top Edge Resize Handle (Drag upward) */}
              <div
                onMouseDown={(e) => handleStartResize(e, s, 'top')}
                data-no-drag="true"
                className="resize-handle absolute top-0 inset-x-0 h-2.5 cursor-ns-resize z-20 group/tophandle flex items-center justify-center"
                title="Drag upward to resize card"
              >
                <div className="w-10 h-0.5 rounded-full bg-slate-600/40 group-hover/tophandle:bg-red-400 group-hover/tophandle:h-1 opacity-0 group-hover:opacity-100 transition-all" />
              </div>

              {/* Drag Handle to Resize Card */}
              <div
                onMouseDown={(e) => handleStartResize(e, s, 'se')}
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

        {items.length === 0 && (
          <div className="col-span-2 py-5 text-center border border-dashed border-slate-800/80 rounded-xl">
            <p className="text-xs text-slate-600">No services in this category</p>
            <button
              onClick={() => onAddService(category)}
              className="mt-1.5 text-xs text-red-400 hover:underline"
            >
              Add service
            </button>
          </div>
        )}
      </div>

      {/* Stacked Live Stats for Category */}
      {items.some((s) => (s.liveStat || s.telemetryType) && s.telemetryType !== 'qbittorrent' && !s.title.toLowerCase().includes('qbit')) && (
        <div className="pt-2 border-t border-slate-800/80 space-y-1.5 mt-1">
          <div className="flex items-center justify-between px-1 text-[10px] font-mono uppercase tracking-wider text-slate-500">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-red-500" />
              <span>Category Telemetry</span>
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          {items
            .filter((s) => (s.liveStat || s.telemetryType) && s.telemetryType !== 'qbittorrent' && !s.title.toLowerCase().includes('qbit'))
            .map((s) => (
              <div
                key={`cat-stat-${s.id}`}
                onClick={() => {
                  if (s.telemetryType && onOpenInspector) {
                    onOpenInspector(s.telemetryType);
                  }
                }}
                className={`group/pill flex items-center justify-between px-3 py-2 rounded-xl bg-[#12141c]/90 border border-slate-800/80 hover:border-slate-700/80 transition-all text-xs ${
                  s.telemetryType ? 'cursor-pointer hover:bg-[#181b28] hover:border-red-500/30' : ''
                }`}
                title={s.telemetryType ? 'Click to inspect live details' : undefined}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="font-semibold text-slate-200 group-hover/pill:text-white truncate">{s.title}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {s.liveStat || 'Live'}
                  </span>
                  {s.telemetryType && (
                    <ChevronRight className="w-3 h-3 text-slate-500 group-hover/pill:text-white transition-transform group-hover/pill:translate-x-0.5" />
                  )}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Floating Drag Overlay */}
      {dragFloating && (
        <div
          style={{
            position: 'fixed',
            left: dragFloating.x + 14,
            top: dragFloating.y + 14,
            pointerEvents: 'none',
            zIndex: 99999,
          }}
          className="rounded-xl border border-red-500 bg-[#1e2230]/95 shadow-2xl p-2.5 flex items-center gap-2.5 ring-2 ring-red-500/50 backdrop-blur-md min-w-[180px]"
        >
          <ServiceIcon icon={dragFloating.card.icon} title={dragFloating.card.title} />
          <div>
            <div className="font-bold text-xs text-white truncate max-w-[160px]">
              {dragFloating.card.title}
            </div>
            <div className="text-[10px] text-red-400 font-semibold flex items-center gap-1 mt-0.5">
              {dragFloating.targetCategory ? (
                <>
                  <span>Move to:</span>
                  <span className="underline decoration-red-400 font-bold">{dragFloating.targetCategory}</span>
                </>
              ) : (
                <span className="text-slate-400">Drag to category</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
