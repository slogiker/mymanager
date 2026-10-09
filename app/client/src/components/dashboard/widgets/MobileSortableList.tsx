import React, { useMemo } from 'react';
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
import { GripVertical } from 'lucide-react';
import { ErrorBoundary } from '../../common/ErrorBoundary';

export interface MobileSortableItem {
  id: string;
  /** Column span when the list uses 2 columns */
  span?: 1 | 2;
  /** Fixed row height in px */
  height: number;
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

function SortableRow({
  item,
  columns,
  canReorder,
}: {
  item: MobileSortableItem;
  columns: 1 | 2;
  canReorder: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !canReorder,
  });
  const span = columns === 2 ? item.span ?? 1 : 1;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        height: item.height,
      }}
      className={`relative group min-w-0 rounded-2xl overflow-hidden ${
        span === 2 ? 'col-span-2' : 'col-span-1'
      } ${
        isDragging
          ? 'z-30 shadow-2xl ring-2 ring-red-500 scale-[1.02]'
          : item.frameClassName || ''
      }`}
    >
      {canReorder && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="absolute top-2 right-2 z-20 p-1 rounded-lg text-slate-500 hover:text-white active:text-red-400 opacity-20 hover:opacity-100 active:opacity-100 bg-slate-900/80 backdrop-blur-sm border border-slate-700/60 touch-none cursor-grab active:cursor-grabbing transition-opacity"
          title="Drag to rearrange"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
      )}
      <div className="w-full h-full">
        <ErrorBoundary isInline fallbackTitle={item.id}>
          {item.render()}
        </ErrorBoundary>
      </div>
    </div>
  );
}

/**
 * Touch-friendly reorderable list for small screens.
 * Items flow in 1 or 2 columns, never overflow horizontally, and cannot be resized.
 * Dragging starts only from the grip handle so normal page scrolling keeps working.
 */
export function MobileSortableList({
  items,
  savedOrder,
  onReorder,
  columns = 1,
  canReorder = true,
}: MobileSortableListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const ids = useMemo(() => items.map((i) => i.id), [items]);
  const orderedIds = useMemo(() => applySavedOrder(ids, savedOrder), [ids, savedOrder]);
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const reorderEnabled = canReorder && Boolean(onReorder) && items.length > 1;

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
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={orderedIds} strategy={rectSortingStrategy}>
        <div className={`grid gap-2 w-full min-w-0 ${columns === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {orderedIds.map((id) => {
            const item = byId.get(id);
            if (!item) return null;
            return <SortableRow key={id} item={item} columns={columns} canReorder={reorderEnabled} />;
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
