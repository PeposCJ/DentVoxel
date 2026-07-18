import { describe, expect, it } from 'vitest';
import { planVolumeLoad } from './volumePolicy';

describe('planVolumeLoad', () => {
  it('keeps moderate CBCT volumes at full resolution when memory allows it', () => {
    expect(planVolumeLoad([401, 401, 325], 8).decimation).toBe(1);
  });

  it('reduces the validated high-resolution case before allocating the volume', () => {
    const plan = planVolumeLoad([811, 811, 651], 8);

    expect(plan.decimation).toBe(2);
    expect(plan.previewVoxels).toBe(405 * 405 * 326);
    expect(plan.previewVoxels).toBeLessThan(plan.targetVoxels);
  });

  it('uses a more conservative plan on low-memory devices', () => {
    const lowMemory = planVolumeLoad([600, 600, 400], 2);
    const higherMemory = planVolumeLoad([600, 600, 400], 16);

    expect(lowMemory.decimation).toBeGreaterThan(higherMemory.decimation);
  });
});
