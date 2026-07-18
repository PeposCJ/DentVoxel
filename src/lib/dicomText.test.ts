import type { DataSet } from 'dicom-parser';
import { describe, expect, it } from 'vitest';
import { readDicomLabel } from './dicomText';

function dataSetFor(bytes: Uint8Array, characterSet: string, parserValue: string): DataSet {
  return {
    byteArray: bytes,
    elements: {
      x0008103e: { tag: 'x0008103e', dataOffset: 0, length: bytes.length },
    },
    string: (tag: string) => tag === 'x00080005' ? characterSet : parserValue,
  } as unknown as DataSet;
}

describe('readDicomLabel', () => {
  it('decodes UTF-8 DICOM labels using Specific Character Set', () => {
    const encoded = new TextEncoder().encode('Cortes extraídos');
    const dataSet = dataSetFor(encoded, 'ISO_IR 192', 'Cortes extraÃdos');

    expect(readDicomLabel(dataSet, 'x0008103e')).toBe('Cortes extraídos');
  });

  it('uses a declared Latin-1 character set', () => {
    const encoded = Uint8Array.from([67, 66, 67, 84, 32, 111, 100, 111, 110, 116, 111, 108, 243, 103, 105, 99, 111]);

    expect(readDicomLabel(dataSetFor(encoded, 'ISO_IR 100', ''), 'x0008103e')).toBe('CBCT odontológico');
  });

  it('removes display-control characters and bounds untrusted labels', () => {
    const unsafe = `Safe\u202e label ${'x'.repeat(200)}`;
    const dataSet = dataSetFor(new TextEncoder().encode(unsafe), 'ISO_IR 192', unsafe);

    const result = readDicomLabel(dataSet, 'x0008103e');
    expect(result).not.toContain('\u202e');
    expect(result.length).toBe(160);
  });
});
