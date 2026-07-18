import type { DataSet } from 'dicom-parser';

const DECODER_LABELS: Record<string, string> = {
  'ISO_IR 100': 'iso-8859-1',
  'ISO_IR 101': 'iso-8859-2',
  'ISO_IR 109': 'iso-8859-3',
  'ISO_IR 110': 'iso-8859-4',
  'ISO_IR 144': 'iso-8859-5',
  'ISO_IR 127': 'iso-8859-6',
  'ISO_IR 126': 'iso-8859-7',
  'ISO_IR 138': 'iso-8859-8',
  'ISO_IR 148': 'iso-8859-9',
  'ISO_IR 13': 'shift_jis',
  'ISO_IR 149': 'euc-kr',
  'ISO_IR 166': 'windows-874',
  'ISO_IR 192': 'utf-8',
  GB18030: 'gb18030',
  GBK: 'gbk',
};

function safeLabel(value: string): string {
  return value
    .normalize('NFC')
    .replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
}

export function readDicomLabel(dataSet: DataSet, tag: string): string {
  const fallback = dataSet.string(tag) ?? '';
  const element = dataSet.elements[tag];
  const characterSets = (dataSet.string('x00080005') ?? '')
    .split('\\')
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);

  if (!element?.length || characterSets.length !== 1) return safeLabel(fallback);
  const decoderLabel = DECODER_LABELS[characterSets[0]];
  if (!decoderLabel) return safeLabel(fallback);

  try {
    const bytes = dataSet.byteArray.subarray(element.dataOffset, element.dataOffset + element.length);
    return safeLabel(new TextDecoder(decoderLabel, { fatal: true }).decode(bytes));
  } catch {
    return safeLabel(fallback);
  }
}
