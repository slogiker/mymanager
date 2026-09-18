import { Service } from '../types';

export const GRID_CONSTANTS = {
  COLS: 2,
  CELL_HEIGHT: 76,
  GAP: 10,
  MAX_ROWS: 20,
} as const;

export interface CardPosition {
  id: number;
  startCol: number; // 0-indexed (0 to COLS - 1)
  startRow: number; // 0-indexed (0 to MAX_ROWS - 1)
  colSpan: number;  // 1 or 2
  rowSpan: number;  // 1 or 2
}

export interface FillerCell {
  col: number;
  row: number;
}

/**
 * Checks if two cards collide in 2D grid space.
 */
export function hasOverlap(
  c1: { id?: number; startCol: number; startRow: number; colSpan: number; rowSpan: number },
  c2: { id?: number; startCol: number; startRow: number; colSpan: number; rowSpan: number }
): boolean {
  if (c1.id !== undefined && c2.id !== undefined && c1.id === c2.id) {
    return false;
  }
  return (
    c1.startCol < c2.startCol + c2.colSpan &&
    c1.startCol + c1.colSpan > c2.startCol &&
    c1.startRow < c2.startRow + c2.rowSpan &&
    c1.startRow + c1.rowSpan > c2.startRow
  );
}

/**
 * Checks if a specific (col, row) coordinate is covered by any placed card.
 */
export function isCellOccupied(col: number, row: number, cards: CardPosition[]): boolean {
  return cards.some(
    (c) =>
      col >= c.startCol &&
      col < c.startCol + c.colSpan &&
      row >= c.startRow &&
      row < c.startRow + c.rowSpan
  );
}

/**
 * Calculates filler placeholder cells for all unoccupied slots in the grid.
 */
export function getFillerCells(
  cards: CardPosition[],
  cols: number = GRID_CONSTANTS.COLS,
  minRows: number = 2
): FillerCell[] {
  const maxRow = cards.length > 0
    ? Math.max(...cards.map((c) => c.startRow + c.rowSpan), minRows)
    : minRows;

  const fillers: FillerCell[] = [];
  for (let r = 0; r < maxRow; r++) {
    for (let c = 0; c < cols; c++) {
      if (!isCellOccupied(c, r, cards)) {
        fillers.push({ col: c, row: r });
      }
    }
  }
  return fillers;
}

/**
 * Validates whether a card can be resized to target dimensions without colliding
 * with other cards or exceeding grid boundaries.
 */
export function canResizeCard(
  card: CardPosition,
  targetColSpan: number,
  targetRowSpan: number,
  otherCards: CardPosition[],
  cols: number = GRID_CONSTANTS.COLS
): boolean {
  // Boundary check
  if (card.startCol + targetColSpan > cols) return false;
  if (targetColSpan < 1 || targetRowSpan < 1) return false;
  if (targetColSpan > cols || targetRowSpan > 3) return false;

  const candidate: CardPosition = {
    ...card,
    colSpan: targetColSpan,
    rowSpan: targetRowSpan,
  };

  // Collision check
  return !otherCards.some((other) => hasOverlap(candidate, other));
}

/**
 * Computes a rearranged layout when a card is resized or moved,
 * pushing any colliding cards down into the next available slots in the grid.
 */
export function computePushedLayout<T extends CardPosition>(
  activeCard: CardPosition,
  allCards: T[],
  cols: number = GRID_CONSTANTS.COLS
): T[] {
  const originalActive = allCards.find((c) => c.id === activeCard.id);
  const normalizedColSpan = Math.min(cols, Math.max(1, activeCard.colSpan));
  const normalizedRowSpan = Math.max(1, Math.min(3, activeCard.rowSpan));
  const normalizedStartCol = normalizedColSpan >= cols ? 0 : Math.min(cols - 1, activeCard.startCol);

  const normalizedActive: CardPosition = {
    id: activeCard.id,
    startCol: normalizedStartCol,
    startRow: Math.max(0, activeCard.startRow),
    colSpan: normalizedColSpan,
    rowSpan: normalizedRowSpan,
  };

  const placed: CardPosition[] = [normalizedActive];
  const others = allCards
    .filter((c) => c.id !== activeCard.id)
    .sort((a, b) => (a.startRow !== b.startRow ? a.startRow - b.startRow : a.startCol - b.startCol));

  for (const card of others) {
    // If the card fits in its existing slot without colliding with any placed cards, keep it
    if (!placed.some((p) => hasOverlap(card, p))) {
      placed.push({ ...card });
      continue;
    }

    // Otherwise, push to the earliest available free slot at or below its current row
    let placedSuccess = false;
    let r = card.startRow;
    while (!placedSuccess && r < GRID_CONSTANTS.MAX_ROWS) {
      for (let c = 0; c <= cols - card.colSpan; c++) {
        const candidate: CardPosition = {
          id: card.id,
          startCol: c,
          startRow: r,
          colSpan: card.colSpan,
          rowSpan: card.rowSpan,
        };
        if (!placed.some((p) => hasOverlap(candidate, p))) {
          placed.push(candidate);
          placedSuccess = true;
          break;
        }
      }
      r++;
    }

    if (!placedSuccess) {
      placed.push({
        id: card.id,
        startCol: 0,
        startRow: r,
        colSpan: card.colSpan,
        rowSpan: card.rowSpan,
      });
    }
  }

  // Return updated cards preserving original items
  return allCards.map((c) => {
    const updated = placed.find((p) => p.id === c.id);
    if (!updated) return c;
    return {
      ...c,
      startCol: updated.startCol,
      startRow: updated.startRow,
      colSpan: updated.colSpan,
      rowSpan: updated.rowSpan,
    };
  });
}

/**
 * Automatically computes or restores non-colliding (startCol, startRow, colSpan, rowSpan)
 * for a list of services in a category mini-grid.
 */
export function layoutCategoryCards(
  services: Service[],
  cols: number = GRID_CONSTANTS.COLS
): (Service & CardPosition)[] {
  const placed: CardPosition[] = [];
  const result: (Service & CardPosition)[] = [];

  // Stable sort: services with saved coordinates first, then by display_order
  const sorted = [...services].sort((a, b) => {
    const aHas = a.start_col != null && a.start_row != null;
    const bHas = b.start_col != null && b.start_row != null;
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    if (aHas && bHas) {
      if (a.start_row !== b.start_row) return (a.start_row || 0) - (b.start_row || 0);
      return (a.start_col || 0) - (b.start_col || 0);
    }
    return (a.display_order || 0) - (b.display_order || 0);
  });

  for (const s of sorted) {
    const colSpan = Math.min(cols, Math.max(1, s.col_span || 2));
    const rowSpan = Math.max(1, s.row_span || 1);
    const savedCol = s.start_col != null ? Math.min(cols - colSpan, Math.max(0, s.start_col)) : null;
    const savedRow = s.start_row != null ? Math.max(0, s.start_row) : null;

    // If explicit saved position is collision-free, retain it
    if (savedCol != null && savedRow != null) {
      const candidate: CardPosition = {
        id: s.id,
        startCol: savedCol,
        startRow: savedRow,
        colSpan,
        rowSpan,
      };
      if (!placed.some((p) => hasOverlap(candidate, p))) {
        placed.push(candidate);
        result.push({ ...s, ...candidate });
        continue;
      }
    }

    // Auto-pack into the first free slot
    let r = 0;
    let placedSuccess = false;
    while (!placedSuccess && r < GRID_CONSTANTS.MAX_ROWS) {
      for (let c = 0; c <= cols - colSpan; c++) {
        const candidate: CardPosition = {
          id: s.id,
          startCol: c,
          startRow: r,
          colSpan,
          rowSpan,
        };
        if (!placed.some((p) => hasOverlap(candidate, p))) {
          placed.push(candidate);
          result.push({ ...s, ...candidate });
          placedSuccess = true;
          break;
        }
      }
      r++;
    }

    // Fallback if full
    if (!placedSuccess) {
      const fallback: CardPosition = {
        id: s.id,
        startCol: 0,
        startRow: r,
        colSpan,
        rowSpan,
      };
      placed.push(fallback);
      result.push({ ...s, ...fallback });
    }
  }

  return result;
}
