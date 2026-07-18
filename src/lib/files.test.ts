import { describe, expect, it } from 'vitest';
import { isPotentialDicom } from './files';

describe('isPotentialDicom', () => {
  it('acepta cortes con o sin extensión DCM', () => {
    expect(isPotentialDicom({ name: 'IM00001', size: 4096 })).toBe(true);
    expect(isPotentialDicom({ name: 'slice.dcm', size: 4096 })).toBe(true);
  });

  it('ignora DICOMDIR y archivos auxiliares pequeños u ocultos', () => {
    expect(isPotentialDicom({ name: 'DICOMDIR', size: 4096 })).toBe(false);
    expect(isPotentialDicom({ name: '.DS_Store', size: 4096 })).toBe(false);
    expect(isPotentialDicom({ name: 'README', size: 100 })).toBe(false);
  });
});
