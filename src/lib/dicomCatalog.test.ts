import { describe, expect, it } from 'vitest';
import { buildDicomCatalog, type IndexedDicomFile } from './dicomCatalog';

function record(overrides: Partial<IndexedDicomFile> = {}): IndexedDicomFile {
  return {
    file: { name: `slice-${overrides.instanceNumber ?? 1}.dcm`, size: 4096 } as File,
    studyInstanceUid: '1.2.3',
    seriesInstanceUid: '1.2.3.1',
    studyDescription: 'CBCT maxilar',
    studyDate: '20260717',
    manufacturer: 'Fabricante de prueba',
    seriesDescription: 'Volumen 0.2 mm',
    modality: 'CT',
    imageType: ['ORIGINAL', 'PRIMARY', 'AXIAL'],
    transferSyntaxUid: '1.2.840.10008.1.2.1',
    rows: 512,
    columns: 512,
    pixelSpacing: [0.2, 0.2],
    sliceThickness: 0.2,
    imagePosition: [0, 0, overrides.instanceNumber ?? 1],
    imageOrientation: [1, 0, 0, 0, 1, 0],
    instanceNumber: overrides.instanceNumber ?? 1,
    numberOfFrames: 1,
    hasPixelData: true,
    ...overrides,
  };
}

describe('buildDicomCatalog', () => {
  it('agrupa por estudio y serie y calcula geometría clínica mínima', () => {
    const records = [
      record({ instanceNumber: 2, imagePosition: [0, 0, 0.4] }),
      record({ instanceNumber: 1, imagePosition: [0, 0, 0.2] }),
      record({ seriesInstanceUid: '1.2.3.2', seriesDescription: 'Scout', imageType: ['LOCALIZER'] }),
    ];

    const catalog = buildDicomCatalog(records, new Map(), 3);
    const [volume, localizer] = catalog.studies[0].series;

    expect(catalog.studies).toHaveLength(1);
    expect(volume.kind).toBe('volume');
    expect(volume.dimensions).toEqual([512, 512, 2]);
    expect(volume.voxelSpacing).toEqual([0.2, 0.2, 0.2]);
    expect(volume.files.map((file) => file.name)).toEqual(['slice-1.dcm', 'slice-2.dcm']);
    expect(localizer.kind).toBe('localizer');
  });

  it('separa sintaxis no soportadas con una razón explícita', () => {
    const records = [
      record({ instanceNumber: 1, transferSyntaxUid: '9.9.9' }),
      record({ instanceNumber: 2, transferSyntaxUid: '9.9.9' }),
    ];

    const series = buildDicomCatalog(records, new Map(), 2).studies[0].series[0];

    expect(series.kind).toBe('incompatible');
    expect(series.reason).toContain('9.9.9');
  });

  it('mantiene separados estudios distintos aunque compartan descripción', () => {
    const records = [
      record({ instanceNumber: 1 }),
      record({ instanceNumber: 2 }),
      record({ studyInstanceUid: '4.5.6', seriesInstanceUid: '4.5.6.1', instanceNumber: 1 }),
      record({ studyInstanceUid: '4.5.6', seriesInstanceUid: '4.5.6.1', instanceNumber: 2 }),
    ];

    expect(buildDicomCatalog(records, new Map(), 4).studies).toHaveLength(2);
  });
});
