import { describe, expect, it } from 'vitest';
import { chooseViewGrid, clampSplit } from './viewLayout';

describe('chooseViewGrid', () => {
  it('uses all available space for one view', () => {
    expect(chooseViewGrid(1, 1200, 700)).toEqual({ columns: 1, rows: 1, expandLast: false });
  });

  it('places two views according to the available aspect ratio', () => {
    expect(chooseViewGrid(2, 1200, 700)).toEqual({ columns: 2, rows: 1, expandLast: false });
    expect(chooseViewGrid(2, 600, 900)).toEqual({ columns: 1, rows: 2, expandLast: false });
  });

  it('expands the final view when three views use a two-by-two grid', () => {
    expect(chooseViewGrid(3, 1000, 800)).toEqual({ columns: 2, rows: 2, expandLast: true });
    expect(chooseViewGrid(3, 1600, 700)).toEqual({ columns: 3, rows: 1, expandLast: false });
  });
});

describe('clampSplit', () => {
  it('keeps adjustable panels between twenty and eighty percent', () => {
    expect(clampSplit(8)).toBe(20);
    expect(clampSplit(47.26)).toBe(47.3);
    expect(clampSplit(94)).toBe(80);
  });
});
