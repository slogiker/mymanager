import React, { useState, useRef } from 'react';
import { GRID_CONSTANTS, computePushedLayout } from '../../../lib/cardGridEngine';
import { UserPreferences, saveUserPreferences } from '../../../lib/userPreferences';
import { PlacedWidget } from './useWidgetRegistry';

export const SIZE_PRESETS: Array<{ colSpan: number; rowSpan: number }> = [
  { colSpan: 1, rowSpan: 1 },
  { colSpan: 2, rowSpan: 1 }, // Standard flat card
  { colSpan: 2, rowSpan: 2 }, // Double height
  { colSpan: 4, rowSpan: 2 }, // Half width
  { colSpan: 8, rowSpan: 2 }, // Full width
];

export interface UseWidgetGridInteractionsProps {
  prefs: UserPreferences;
  onUpdatePrefs: (updated: UserPreferences) => void;
  userId?: number;
  placedWidgets: PlacedWidget[];
  onUpdateCardLayout?: (updates: Array<{ id: number; start_col: number; start_row: number; col_span: number; row_span: number }>) => void;
}

export function useWidgetGridInteractions({
  prefs,
  onUpdatePrefs,
  userId,
  placedWidgets,
  onUpdateCardLayout,
}: UseWidgetGridInteractionsProps) {
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

  const cycleWidgetSize = (widgetId: string, currentCols: number, currentRows: number) => {
    const currentIndex = SIZE_PRESETS.findIndex(
      (p) => p.colSpan === currentCols && p.rowSpan === currentRows
    );
    const nextIndex = (currentIndex + 1) % SIZE_PRESETS.length;
    const nextPreset = SIZE_PRESETS[nextIndex];

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
    const changedServices: Array<{ id: number; start_col: number; start_row: number; col_span: number; row_span: number }> = [];

    for (const item of pushed) {
      if (item.id.startsWith('svc-')) {
        const sId = parseInt(item.id.replace('svc-', ''), 10);
        changedServices.push({
          id: sId,
          start_col: item.startCol,
          start_row: item.startRow,
          col_span: item.colSpan,
          row_span: item.rowSpan,
        });
      } else {
        newLayouts[item.id] = {
          startCol: item.startCol,
          startRow: item.startRow,
          colSpan: item.colSpan,
          rowSpan: item.rowSpan,
        };
      }
    }

    if (changedServices.length > 0 && onUpdateCardLayout) {
      onUpdateCardLayout(changedServices);
    }
    const updatedPrefs = { ...prefs, widgetLayouts: newLayouts };
    onUpdatePrefs(updatedPrefs);
    saveUserPreferences(userId, updatedPrefs);
  };

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
          const changedServices: Array<{ id: number; start_col: number; start_row: number; col_span: number; row_span: number }> = [];

          for (const item of finalLayout) {
            if (item.id.startsWith('svc-')) {
              const svcId = parseInt(item.id.replace('svc-', ''), 10);
              changedServices.push({
                id: svcId,
                start_col: item.startCol,
                start_row: item.startRow,
                col_span: item.colSpan,
                row_span: item.rowSpan,
              });
            } else {
              updatedLayouts[item.id] = {
                startCol: item.startCol,
                startRow: item.startRow,
                colSpan: item.colSpan,
                rowSpan: item.rowSpan,
              };
            }
          }

          if (changedServices.length > 0 && onUpdateCardLayout) {
            onUpdateCardLayout(changedServices);
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
      const changedServices: Array<{ id: number; start_col: number; start_row: number; col_span: number; row_span: number }> = [];

      for (const item of finalLayout) {
        const effectiveCols = item.id === widget.id ? finalCols : item.colSpan;
        const effectiveRows = item.id === widget.id ? finalRows : item.rowSpan;
        if (item.id.startsWith('svc-')) {
          const svcId = parseInt(item.id.replace('svc-', ''), 10);
          changedServices.push({
            id: svcId,
            start_col: item.startCol,
            start_row: item.startRow,
            col_span: effectiveCols,
            row_span: effectiveRows,
          });
        } else {
          updatedLayouts[item.id] = {
            startCol: item.startCol,
            startRow: item.startRow,
            colSpan: effectiveCols,
            rowSpan: effectiveRows,
          };
        }
      }

      if (changedServices.length > 0 && onUpdateCardLayout) {
        onUpdateCardLayout(changedServices);
      }
      const updatedPrefs = { ...prefs, widgetLayouts: updatedLayouts };
      onUpdatePrefs(updatedPrefs);
      saveUserPreferences(userId, updatedPrefs);
      setLivePushedWidgets(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return {
    gridRef,
    preventClickRef,
    resizing,
    cardDragging,
    livePushedWidgets,
    cycleWidgetSize,
    handleStartCardDrag,
    handleStartResize,
  };
}
