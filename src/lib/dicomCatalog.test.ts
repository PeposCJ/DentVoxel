import { describe, expect, it } from 'vitest';
import { localize, type TranslationKey } from '../i18n';
import { buildDicomCatalog, indexDicomFiles, type IndexedDicomFile } from './dicomCatalog';

function record(overrides: Partial<IndexedDicomFile> = {}): IndexedDicomFile {
  return {
    file: { name: `slice-${overrides.instanceNumber ?? 1}.dcm`, size: 4096 } as File,
    studyInstanceUid: '1.2.3',
    seriesInstanceUid: '1.2.3.1',
    studyDescription: 'Maxillary CBCT',
    studyDate: '20260717',
    manufacturer: 'Test manufacturer',
    seriesDescription: '0.2 mm volume',
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
  it('groups by study and series and calculates minimum clinical geometry', () => {
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

  it('separates unsupported transfer syntaxes with an explicit reason', () => {
    const records = [
      record({ instanceNumber: 1, transferSyntaxUid: '9.9.9' }),
      record({ instanceNumber: 2, transferSyntaxUid: '9.9.9' }),
    ];

    const series = buildDicomCatalog(records, new Map(), 2).studies[0].series[0];

    expect(series.kind).toBe('incompatible');
    expect(localize('en', series.reason)).toContain('9.9.9');
  });

  it('reports a missing transfer syntax without embedding a language-specific fallback', () => {
    const series = buildDicomCatalog([
      record({ instanceNumber: 1, transferSyntaxUid: '' }),
      record({ instanceNumber: 2, transferSyntaxUid: '' }),
    ], new Map(), 2).studies[0].series[0];

    expect(localize('en', series.reason)).toBe('The DICOM transfer syntax is not declared');
    expect(localize('es', series.reason)).toBe('La sintaxis de transferencia DICOM no está declarada');
  });

  it('summarizes usable, separated, and indexed files without exposing file names', () => {
    const records = [
      record({ instanceNumber: 1 }),
      record({ instanceNumber: 2 }),
      record({ seriesInstanceUid: '1.2.3.2', seriesDescription: 'Scout', imageType: ['LOCALIZER'] }),
      record({ seriesInstanceUid: '1.2.3.3', instanceNumber: 1, transferSyntaxUid: '9.9.9' }),
      record({ seriesInstanceUid: '1.2.3.3', instanceNumber: 2, transferSyntaxUid: '9.9.9' }),
    ];
    const catalog = buildDicomCatalog(records, new Map<TranslationKey, number>([['invalidDicomIssue', 1]]), 6);

    expect(catalog.summary).toEqual({
      dicomFiles: 5,
      volumeFiles: 2,
      separatedFiles: 4,
      volumeSeries: 1,
      localizerSeries: 1,
      incompatibleSeries: 1,
    });
  });

  it('blocks volumes above the current safe voxel limit before pixel decoding', () => {
    const series = buildDicomCatalog([
      record({ instanceNumber: 1, rows: 16384, columns: 16384 }),
      record({ instanceNumber: 2, rows: 16384, columns: 16384 }),
    ], new Map(), 2).studies[0].series[0];

    expect(series.kind).toBe('incompatible');
    expect(localize('en', series.reason)).toContain('safe local limit');
  });

  it('keeps different studies separate even when they share a description', () => {
    const records = [
      record({ instanceNumber: 1 }),
      record({ instanceNumber: 2 }),
      record({ studyInstanceUid: '4.5.6', seriesInstanceUid: '4.5.6.1', instanceNumber: 1 }),
      record({ studyInstanceUid: '4.5.6', seriesInstanceUid: '4.5.6.1', instanceNumber: 2 }),
    ];

    expect(buildDicomCatalog(records, new Map(), 4).studies).toHaveLength(2);
  });

  it('honors cancellation before the classification stage', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(indexDicomFiles([], () => undefined, controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});
