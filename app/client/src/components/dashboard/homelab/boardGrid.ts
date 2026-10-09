import { useEffect, useState } from 'react';
import { GRID_CONSTANTS } from '../../../lib/cardGridEngine';

/**
 * Unified board grid: categories, widgets and node cards all snap to the same cells.
 * Cell height and gap match the service cards inside categories, so everything lines up.
 */
export const BOARD = {
  CELL_HEIGHT: GRID_CONSTANTS.CELL_HEIGHT,
  GAP: GRID_CONSTANTS.GAP,
  CATEGORY_COLS: 2,
  MAX_ROWS: 8,
  DEFAULT_WIDGET: { colSpan: 2, rowSpan: 2 },
  DEFAULT_NODE: { colSpan: 3, rowSpan: 2 },
};

/** Number of board columns for the current viewport width */
export function useBoardCols(): number {
  const calc = () => (
    typeof window === 'undefined' ? 6
    : window.innerWidth >= 1024 ? 6
    : window.innerWidth >= 768 ? 4
    : window.innerWidth >= 640 ? 2
    : 1
  );
  const [cols, setCols] = useState(calc);
  useEffect(() => {
    const onResize = () => setCols(calc());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return cols;
}

/**
 * Phones, plus touch tablets narrower than 1024px. These get the single-flow
 * reorderable layout: no free grid placement, no resize handles.
 */
const MOBILE_QUERY = '(max-width: 767px), (pointer: coarse) and (max-width: 1023px)';

export function useIsMobile(): boolean {
  const get = () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches;
  const [isMobile, setIsMobile] = useState(get);
  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return isMobile;
}

/** Inline grid placement for a board item */
export function boardSpanStyle(colSpan: number, rowSpan: number, boardCols: number) {
  return {
    gridColumn: `span ${Math.max(1, Math.min(colSpan, boardCols))}`,
    gridRow: `span ${Math.max(1, rowSpan)}`,
  };
}
