import React, { useMemo, useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowUpDown, Check, GripVertical } from 'lucide-react';
import { ErrorBoundary } from '../../common/ErrorBoundary';

export interface MobileSortableItem {
  id: string;
  /** Column span when the list uses 2 columns */
  span?: 1 | 2;
  /** Fixed row height in px (widgets keep their designed proportions) */
  height?: number;
  /** Auto height with a floor (service cards grow with their title) */
  minHeight?: number;
  /**
   * Draw the shared card frame. Service cards bring their own frame, every other
   * widget renders frameless content that expects the grid to provide one.
   */
  framed?: boolean;
  /** Extra classes for the item frame (e.g. dimmed VPN-locked state) */
  frameClassName?: string;
  render: () => React.ReactNode;
}

export interface MobileSortableListProps {
  items: MobileSortableItem[];
  savedOrder?: string[];
  onReorder?: (order: string[]) => void;
  columns?: 1 | 2;
  canReorder?: boolean;
}

/** Saved ids first (in saved order), then any new ids in their natural order */
export function applySavedOrder(ids: string[], saved?: string[]): string[] {
  if (!saved || saved.length === 0) return ids;
  const known = new Set(ids);
  const result = saved.filter((id) => known.has(id));
  const placed = new Set(result);
  for (const id of ids) if (!placed.has(id)) result.push(id);
  return result;
}

function SortableCard({
  item,
  columns,
  arrange,
}: {
  item: MobileSortableItem;
  columns: 1 | 2;
  arrange: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !arrange,
  });
  const span = columns === 2 ? item.span ?? 1 : 1;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        ...(item.height ? { height: item.height } : { minHeight: item.minHeight ?? 96 }),
      }}
      className={`relative min-w-0 ${span === 2 ? 'col-span-2' : 'col-span-1'} ${
        isDragging ? 'z-30 scale-[1.02]' : ''
      } ${arrange ? 'rounded-2xl ring-1 ring-red-500/40' : ''}`}
    >
      {/* Content: taps stay dead while arranging so a drag never navigates */}
      <div
        className={`h-full w-full ${arrange ? 'pointer-events-none select-none' : ''} ${
          isDragging ? 'opacity-90' : ''
        } ${
          item.framed === false
            ? ''
            : 'overflow-hidden rounded-2xl border border-slate-800/80 bg-[#16181f]/85 shadow-[0_2px_14px_-8px_rgba(0,0,0,0.9)]'
        } ${isDragging ? 'shadow-2xl' : ''} ${item.frameClassName || ''}`}
      >
        <ErrorBoundary isInline fallbackTitle={item.id}>
          {item.render()}
        </ErrorBoundary>
      </div>

      {arrange && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="absolute right-1 top-1/2 z-20 flex h-11 w-7 -translate-y-1/2 touch-none cursor-grab items-center justify-center rounded-lg border border-red-500/40 bg-[#12141c]/95 text-red-300 shadow-lg active:cursor-grabbing active:bg-red-500/20"
          title="Drag to rearrange"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/**
 * Touch-friendly reorderable list for small screens.
 * Items flow in 1 or 2 columns, never overflow horizontally, and cannot be resized.
 * Cards keep their natural height, so nothing gets clipped; the drag handles only
 * appear in an explicit "Arrange" mode to keep the resting dashboard clean.
 */
export function MobileSortableList({
  items,
  savedOrder,
  onReorder,
  columns = 1,
  canReorder = true,
}: MobileSortableListProps) {
  const [arrange, setArrange] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const ids = useMemo(() => items.map((i) => i.id), [items]);
  const orderedIds = useMemo(() => applySavedOrder(ids, savedOrder), [ids, savedOrder]);
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const reorderAvailable = canReorder && Boolean(onReorder) && items.length > 1;

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id || !onReorder) return;
    const from = orderedIds.indexOf(String(active.id));
    const to = orderedIds.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    const next = arrayMove(orderedIds, from, to);
    // Keep positions of items that are currently not rendered (hidden or filtered out)
    const rest = (savedOrder || []).filter((id) => !next.includes(id));
    onReorder([...next, ...rest]);
  };

  return (
    <div className="space-y-2">
      {reorderAvailable && (
        <div className="flex items-center justify-end gap-2">
          <span className="mr-auto text-[10px] font-mono uppercase tracking-[0.12em] text-slate-600">
            {arrange ? 'Drag to rearrange' : 'Your board'}
          </span>
          <button
            type="button"
            onClick={() => setArrange((v) => !v)}
            aria-pressed={arrange}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-mono font-semibold transition-colors ${
              arrange
                ? 'border-red-500/50 bg-red-500/15 text-red-300'
                : 'border-slate-800 bg-white/[0.02] text-slate-500 active:bg-white/[0.06]'
            }`}
          >
            {arrange ? <Check className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3" />}
            {arrange ? 'Done' : 'Arrange'}
          </button>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={orderedIds} strategy={rectSortingStrategy}>
          <div
            className={`grid w-full min-w-0 items-stretch gap-2.5 ${
              columns === 2 ? 'grid-cols-2' : 'grid-cols-1'
            }`}
          >
            {orderedIds.map((id) => {
              const item = byId.get(id);
              if (!item) return null;
              return <SortableCard key={id} item={item} columns={columns} arrange={arrange} />;
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
