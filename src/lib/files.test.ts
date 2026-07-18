import { describe, expect, it } from 'vitest';
import { isPotentialDicom } from './files';

describe('isPotentialDicom', () => {
  it('accepts slices with or without a DCM extension', () => {
    expect(isPotentialDicom({ name: 'IM00001', size: 4096 })).toBe(true);
    expect(isPotentialDicom({ name: 'slice.dcm', size: 4096 })).toBe(true);
  });

  it('ignores DICOMDIR and small or hidden auxiliary files', () => {
    expect(isPotentialDicom({ name: 'DICOMDIR', size: 4096 })).toBe(false);
    expect(isPotentialDicom({ name: '.DS_Store', size: 4096 })).toBe(false);
    expect(isPotentialDicom({ name: 'README', size: 100 })).toBe(false);
  });
});
