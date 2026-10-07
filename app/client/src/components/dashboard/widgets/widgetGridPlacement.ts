import { CardPosition, GRID_CONSTANTS, hasOverlap } from '../../../lib/cardGridEngine';
import React from 'react';

export interface RawWidgetDefinition {
  id: string;
  title: string;
  visible: boolean;
  defaultColSpan: number;
  defaultRowSpan: number;
  defaultStartCol: number;
  defaultStartRow: number;
  render: (colSpan: number, rowSpan: number) => React.ReactNode;
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

export function computePlacedWidgets(
  rawWidgets: RawWidgetDefinition[],
  savedLayouts: Record<string, { colSpan?: number; rowSpan?: number; startCol?: number; startRow?: number }> = {}
): PlacedWidget[] {
  const placed: PlacedWidget[] = [];

  for (const w of rawWidgets) {
    const saved = savedLayouts[w.id];
    const colSpan = saved?.colSpan || w.defaultColSpan;
    const rowSpan = saved?.rowSpan || w.defaultRowSpan;

    // 1. Check user-saved custom position
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

    // 2. Check default declared position
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

    // 3. Fallback scan for first available slot without collision
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
}
