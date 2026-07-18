import { describe, expect, it } from 'vitest';
import {
  confirmDentalArch,
  createDentalArch,
  moveDentalArchPoint,
  sampleDentalArch,
} from './dentalArch';

describe('dental arch geometry', () => {
  it('samples an arch at regular physical millimetre intervals and includes its endpoint', () => {
    const curve = createDentalArch([[0, 0, 0], [10, 0, 0]]);
    const samples = sampleDentalArch(curve, 2.5, [0, 0, 1]);
    expect(samples.map((sample) => sample.distanceMm)).toEqual([0, 2.5, 5, 7.5, 10]);
    expect(samples.at(-1)?.position).toEqual([10, 0, 0]);
  });

  it('follows multiple segments using accumulated distance', () => {
    const curve = createDentalArch([[0, 0, 0], [10, 0, 0], [10, 10, 0]]);
    const samples = sampleDentalArch(curve, 5, [0, 0, 1]);
    expect(samples.map((sample) => sample.position)).toEqual([
      [0, 0, 0], [5, 0, 0], [10, 0, 0], [10, 5, 0], [10, 10, 0],
    ]);
    expect(samples.at(-1)?.normal).toEqual([-1, 0, 0]);
  });

  it('requires professional confirmation again after an edit', () => {
    const confirmed = confirmDentalArch(createDentalArch([[0, 0, 0], [10, 0, 0]]));
    const edited = moveDentalArchPoint(confirmed, 1, [12, 1, 0]);
    expect(confirmed.confirmed).toBe(true);
    expect(edited.confirmed).toBe(false);
    expect(edited.controlPoints[1]).toEqual([12, 1, 0]);
  });

  it('rejects invalid or degenerate geometry', () => {
    expect(() => createDentalArch([[0, 0, 0]])).toThrow();
    const curve = createDentalArch([[0, 0, 0], [0, 0, 0]]);
    expect(() => sampleDentalArch(curve, 1, [0, 0, 1])).toThrow();
  });
});
