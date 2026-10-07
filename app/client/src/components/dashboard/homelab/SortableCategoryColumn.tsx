import React, { useState, useEffect, useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Plus,
  Edit2,
} from 'lucide-react';
import { Service, JellyfinStats } from '../../../types';
import {
  GRID_CONSTANTS,
  layoutCategoryCards,
  getFillerCells,
} from '../../../lib/cardGridEngine';
import { ServiceIcon } from '../common/ServiceIcon';
import { ServiceCardItem } from '../widgets/ServiceCardItem';
import { useCategoryCardInteraction } from './useCategoryCardInteraction';
import { BOARD, boardSpanStyle } from './boardGrid';

export interface SortableCategoryColumnProps {
  id: string;
  category: string;
  items: Service[];
  boardCols: number;
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
  jellyfinStats?: JellyfinStats | null;
}

export function SortableCategoryColumn({
  id,
  category,
  items,
  boardCols,
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
  jellyfinStats,
}: SortableCategoryColumnProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const [isDropTargetHovered, setIsDropTargetHovered] = useState<boolean>(false);

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

  // Compute placed cards in the category mini-grid
  const placedCards = useMemo(() => {
    return layoutCategoryCards(items, GRID_CONSTANTS.COLS);
  }, [items]);

  const {
    livePushedCards,
    resizing,
    cardDragging,
    dragFloating,
    gridRef,
    preventClickRef,
    handleStartCardDrag,
    handleStartResize,
  } = useCategoryCardInteraction({
    category,
    placedCards,
    onMoveCardCategory,
    onUpdateCardLayout,
  });

  const activeCards = livePushedCards || placedCards;
  const isInteracting = resizing !== null || cardDragging !== null || isDropTargetHovered;

  // Compute filler placeholder cells for unoccupied slots
  const fillerCells = useMemo(() => {
    return getFillerCells(activeCards, GRID_CONSTANTS.COLS, isInteracting ? 3 : 2);
  }, [activeCards, isInteracting]);

  // Category is one big card on the board: fixed width, height in board rows = header + content rows
  const contentRows = activeCards.reduce((m, c) => Math.max(m, c.startRow + c.rowSpan), 1);
  const boardRows = 1 + (isInteracting ? Math.max(contentRows + 1, 3) : contentRows);

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, ...boardSpanStyle(BOARD.CATEGORY_COLS, boardRows, boardCols) }}
      data-category-column={category}
      className={`group/col relative min-w-0 p-3 transition-colors duration-200 flex flex-col gap-2.5 rounded-2xl bg-[#12141c]/90 border border-slate-800/80 hover:border-slate-700/80 shadow-md ${
        isDropTargetHovered
          ? 'ring-2 ring-red-500 bg-red-500/10 shadow-[0_0_30px_rgba(239,68,68,0.25)] border-red-500/40'
          : ''
      }`}
    >
      {/* Category Drop Indicator Banner (overlay, does not change card height) */}
      {isDropTargetHovered && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-xl border border-dashed border-red-500 bg-red-500/20 text-red-300 font-bold text-xs flex items-center gap-2 animate-pulse shadow-lg pointer-events-none whitespace-nowrap">
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

          const isVpnRequired = Boolean(
            s.requires_vpn ||
            (s.url && (s.url.includes('.home.arpa') || s.url.includes('192.168.1.') || s.url.includes('10.7.235.')))
          );
          const isVpnLocked = isVpnRequired && vpnConnected === false;

          return (
            <div
              key={s.id}
              onMouseDown={(e) => isOwner && handleStartCardDrag(e, s)}
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
              } p-3`}
            >
              <ServiceCardItem
                service={s}
                colSpan={currentColSpan}
                rowSpan={currentRowSpan}
                isOwner={isOwner}
                noFrame={true}
                locked={isVpnLocked}
                jellyfinStats={jellyfinStats}
                onCardClick={(svc) => {
                  if (preventClickRef.current) return;
                  if (isVpnLocked) {
                    onVpnLockedClick?.(svc.title, svc.url);
                    return;
                  }
                  if (svc.url === '#' || !svc.url) {
                    if (svc.telemetryType && onOpenInspector) {
                      onOpenInspector(svc.telemetryType);
                    }
                  } else {
                    window.open(svc.url, '_blank', 'noopener,noreferrer');
                  }
                }}
                onEdit={onEditService}
                onDelete={onDeleteService}
                onInspect={onOpenInspector}
              />

              {/* Top edge resize handle: expand upward */}
              {isOwner && startRow > 0 && currentRowSpan < 3 && (
                <div
                  onMouseDown={(e) => handleStartResize(e, s, 'top')}
                  className="resize-handle absolute top-0 left-0 right-0 h-2 bg-transparent hover:bg-red-500/30 cursor-n-resize opacity-0 group-hover:opacity-100 transition-opacity z-20"
                  title="Drag up to expand height"
                />
              )}

              {/* Bottom-right corner resize handle: expand width & height */}
              {isOwner && (
                <div
                  onMouseDown={(e) => handleStartResize(e, s, 'se')}
                  className="resize-handle absolute bottom-1 right-1 w-4 h-4 text-slate-600 hover:text-red-400 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20"
                  title="Drag to resize card width and height"
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
        })}

        {items.length === 0 && (
          <div className="col-span-2 flex flex-col items-center justify-center text-center border border-dashed border-slate-800/80 rounded-xl">
            <p className="text-xs text-slate-600">No services in this category</p>
            <button
              onClick={() => onAddService(category)}
              className="mt-1 text-xs text-red-400 hover:underline"
            >
              Add service
            </button>
          </div>
        )}
      </div>

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
