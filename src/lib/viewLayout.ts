export interface ViewGrid {
  columns: number;
  rows: number;
  expandLast: boolean;
}

export function chooseManualViewGrid(viewCount: number): ViewGrid {
  if (viewCount <= 1) return { columns: 1, rows: 1, expandLast: false };
  if (viewCount === 2) return { columns: 2, rows: 1, expandLast: false };
  if (viewCount === 3) return { columns: 2, rows: 2, expandLast: true };
  return { columns: 2, rows: 2, expandLast: false };
}

export function chooseViewGrid(viewCount: number, width: number, height: number): ViewGrid {
  if (viewCount <= 1) return { columns: 1, rows: 1, expandLast: false };
  const aspectRatio = height > 0 ? width / height : 1;
  if (viewCount === 2) {
    return aspectRatio >= 1.15
      ? { columns: 2, rows: 1, expandLast: false }
      : { columns: 1, rows: 2, expandLast: false };
  }
  if (viewCount === 3) {
    return aspectRatio >= 1.8
      ? { columns: 3, rows: 1, expandLast: false }
      : { columns: 2, rows: 2, expandLast: true };
  }
  return { columns: 2, rows: 2, expandLast: false };
}

export function clampSplit(percent: number): number {
  return Math.min(80, Math.max(20, Math.round(percent * 10) / 10));
}
