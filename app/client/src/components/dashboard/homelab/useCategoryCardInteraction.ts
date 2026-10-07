import React, { useState, useRef } from 'react';
import { Service } from '../../../types';
import {
  GRID_CONSTANTS,
  CardPosition,
  computePushedLayout,
} from '../../../lib/cardGridEngine';

export interface UseCategoryCardInteractionProps {
  category: string;
  placedCards: (Service & CardPosition)[];
  onMoveCardCategory?: (serviceId: number, fromCategory: string, toCategory: string) => void;
  onUpdateCardLayout?: (updates: Array<{ id: number; start_col: number; start_row: number; col_span: number; row_span: number }>) => void;
}

export function useCategoryCardInteraction({
  category,
  placedCards,
  onMoveCardCategory,
  onUpdateCardLayout,
}: UseCategoryCardInteractionProps) {
  const [livePushedCards, setLivePushedCards] = useState<(Service & CardPosition)[] | null>(null);
  const livePushedCardsRef = useRef(livePushedCards);
  livePushedCardsRef.current = livePushedCards;

  const [resizing, setResizing] = useState<CardPosition | null>(null);
  const resizingRef = useRef(resizing);
  resizingRef.current = resizing;

  const [cardDragging, setCardDragging] = useState<CardPosition | null>(null);
  const [dragFloating, setDragFloating] = useState<{
    card: Service & CardPosition;
    x: number;
    y: number;
    targetCategory: string | null;
  } | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);
  const preventClickRef = useRef<boolean>(false);

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

  return {
    livePushedCards,
    resizing,
    cardDragging,
    dragFloating,
    gridRef,
    preventClickRef,
    handleStartCardDrag,
    handleStartResize,
  };
}
