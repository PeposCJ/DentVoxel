import dicomParser, { type DataSet } from 'dicom-parser';
import { isPotentialDicom } from './files';

const MAX_HEADER_BYTES = 4 * 1024 * 1024;

const SUPPORTED_TRANSFER_SYNTAXES = new Set([
  '1.2.840.10008.1.2',
  '1.2.840.10008.1.2.1',
  '1.2.840.10008.1.2.2',
  '1.2.840.10008.1.2.4.50',
  '1.2.840.10008.1.2.4.51',
  '1.2.840.10008.1.2.4.57',
  '1.2.840.10008.1.2.4.70',
  '1.2.840.10008.1.2.4.80',
  '1.2.840.10008.1.2.4.81',
  '1.2.840.10008.1.2.4.90',
  '1.2.840.10008.1.2.4.91',
  '1.2.840.10008.1.2.4.201',
  '1.2.840.10008.1.2.4.202',
  '1.2.840.10008.1.2.4.203',
  '1.2.840.10008.1.2.5',
]);

export type SeriesKind = 'volume' | 'localizer' | 'incompatible';

export interface IndexedDicomFile {
  file: File;
  studyInstanceUid: string;
  seriesInstanceUid: string;
  studyDescription: string;
  studyDate: string;
  manufacturer: string;
  seriesDescription: string;
  modality: string;
  imageType: string[];
  transferSyntaxUid: string;
  rows?: number;
  columns?: number;
  pixelSpacing?: [number, number];
  sliceThickness?: number;
  spacingBetweenSlices?: number;
  imagePosition?: [number, number, number];
  imageOrientation?: [number, number, number, number, number, number];
  instanceNumber?: number;
  numberOfFrames: number;
  hasPixelData: boolean;
}

export interface DicomSeries {
  id: string;
  studyId: string;
  description: string;
  modality: string;
  kind: SeriesKind;
  reason?: string;
  files: File[];
  fileCount: number;
  imageCount: number;
  dimensions: [number | undefined, number | undefined, number];
  voxelSpacing: [number | undefined, number | undefined, number | undefined];
}

export interface DicomStudy {
  id: string;
  description: string;
  date: string;
  manufacturer: string;
  series: DicomSeries[];
}

export interface DicomCatalog {
  studies: DicomStudy[];
  issues: Array<{ reason: string; count: number }>;
  scannedFiles: number;
}

function clean(value?: string): string {
  return value?.trim() ?? '';
}

function numbers(value?: string, expected?: number): number[] | undefined {
  if (!value) return undefined;
  const parsed = value.split('\\').map(Number);
  if (parsed.some((item) => !Number.isFinite(item))) return undefined;
  if (expected !== undefined && parsed.length < expected) return undefined;
  return parsed;
}

function toMetadata(file: File, dataSet: DataSet): IndexedDicomFile {
  const pixelSpacing = numbers(dataSet.string('x00280030'), 2);
  const imagePosition = numbers(dataSet.string('x00200032'), 3);
  const imageOrientation = numbers(dataSet.string('x00200037'), 6);

  return {
    file,
    studyInstanceUid: clean(dataSet.string('x0020000d')),
    seriesInstanceUid: clean(dataSet.string('x0020000e')),
    studyDescription: clean(dataSet.string('x00081030')),
    studyDate: clean(dataSet.string('x00080020')),
    manufacturer: clean(dataSet.string('x00080070')),
    seriesDescription: clean(dataSet.string('x0008103e')),
    modality: clean(dataSet.string('x00080060')),
    imageType: clean(dataSet.string('x00080008')).split('\\').filter(Boolean),
    transferSyntaxUid: clean(dataSet.string('x00020010')),
    rows: dataSet.uint16('x00280010'),
    columns: dataSet.uint16('x00280011'),
    pixelSpacing: pixelSpacing ? [pixelSpacing[0], pixelSpacing[1]] : undefined,
    sliceThickness: dataSet.floatString('x00180050'),
    spacingBetweenSlices: dataSet.floatString('x00180088'),
    imagePosition: imagePosition ? [imagePosition[0], imagePosition[1], imagePosition[2]] : undefined,
    imageOrientation: imageOrientation ? [
      imageOrientation[0], imageOrientation[1], imageOrientation[2],
      imageOrientation[3], imageOrientation[4], imageOrientation[5],
    ] : undefined,
    instanceNumber: dataSet.intString('x00200013'),
    numberOfFrames: Math.max(1, dataSet.intString('x00280008') ?? 1),
    hasPixelData: Boolean(dataSet.elements.x7fe00010),
  };
}

async function parseFile(file: File): Promise<IndexedDicomFile> {
  const parse = async (length: number) => {
    const bytes = new Uint8Array(await file.slice(0, length).arrayBuffer());
    return dicomParser.parseDicom(bytes, { untilTag: 'x7fe00010' });
  };

  try {
    return toMetadata(file, await parse(Math.min(file.size, MAX_HEADER_BYTES)));
  } catch (error) {
    if (file.size <= MAX_HEADER_BYTES) throw error;
    return toMetadata(file, await parse(file.size));
  }
}

function cross(a: number[], b: number[]): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function location(item: IndexedDicomFile): number | undefined {
  if (!item.imagePosition || !item.imageOrientation) return undefined;
  const normal = cross(item.imageOrientation.slice(0, 3), item.imageOrientation.slice(3, 6));
  return item.imagePosition.reduce((sum, value, index) => sum + value * normal[index], 0);
}

function median(values: number[]): number | undefined {
  if (!values.length) return undefined;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

function nearlyEqual(a?: number, b?: number): boolean {
  if (a === undefined || b === undefined) return a === b;
  return Math.abs(a - b) <= Math.max(0.001, Math.abs(a) * 0.001);
}

function classify(items: IndexedDicomFile[]): { kind: SeriesKind; reason?: string } {
  const first = items[0];
  const searchable = `${first.seriesDescription} ${items.flatMap((item) => item.imageType).join(' ')}`.toUpperCase();
  if (/LOCALIZER|LOCALISER|SCOUT|TOPOGRAM|SURVIEW|PROJECTION/.test(searchable)) {
    return { kind: 'localizer', reason: 'Vista de localización separada del volumen' };
  }
  if (items.some((item) => item.numberOfFrames > 1)) {
    return { kind: 'incompatible', reason: 'DICOM multiframe aún no soportado' };
  }
  if (items.some((item) => !item.hasPixelData)) {
    return { kind: 'incompatible', reason: 'La serie contiene objetos sin datos de píxel' };
  }
  if (items.length < 2) {
    return { kind: 'incompatible', reason: 'Se requieren al menos dos cortes para reconstruir un volumen' };
  }
  const unsupportedSyntax = items.find((item) => !SUPPORTED_TRANSFER_SYNTAXES.has(item.transferSyntaxUid));
  if (unsupportedSyntax) {
    const syntax = unsupportedSyntax.transferSyntaxUid || 'no declarada';
    return { kind: 'incompatible', reason: `Sintaxis de transferencia no soportada: ${syntax}` };
  }
  if (first.modality && first.modality !== 'CT') {
    return { kind: 'incompatible', reason: `Modalidad ${first.modality} no compatible con volumen CBCT` };
  }
  if (items.some((item) => !item.rows || !item.columns || !item.pixelSpacing || !item.imagePosition || !item.imageOrientation)) {
    return { kind: 'incompatible', reason: 'Geometría espacial DICOM incompleta' };
  }
  if (items.some((item) => item.rows !== first.rows || item.columns !== first.columns)) {
    return { kind: 'incompatible', reason: 'Dimensiones de corte inconsistentes' };
  }
  if (items.some((item) => !nearlyEqual(item.pixelSpacing?.[0], first.pixelSpacing?.[0]) || !nearlyEqual(item.pixelSpacing?.[1], first.pixelSpacing?.[1]))) {
    return { kind: 'incompatible', reason: 'Espaciado de píxel inconsistente' };
  }
  if (items.some((item) => item.imageOrientation?.some((value, index) => !nearlyEqual(value, first.imageOrientation?.[index])))) {
    return { kind: 'incompatible', reason: 'Orientación de cortes inconsistente' };
  }
  return { kind: 'volume' };
}

function buildSeries(studyId: string, seriesId: string, items: IndexedDicomFile[]): DicomSeries {
  const sorted = [...items].sort((a, b) => {
    const aLocation = location(a);
    const bLocation = location(b);
    if (aLocation !== undefined && bLocation !== undefined) return aLocation - bLocation;
    return (a.instanceNumber ?? 0) - (b.instanceNumber ?? 0);
  });
  const locations = sorted.map(location).filter((value): value is number => value !== undefined);
  const distances = locations.slice(1).map((value, index) => Math.abs(value - locations[index])).filter((value) => value > 0.0001);
  const first = sorted[0];
  const zSpacing = median(distances) ?? first.spacingBetweenSlices ?? first.sliceThickness;
  const classification = classify(sorted);

  return {
    id: seriesId,
    studyId,
    description: first.seriesDescription || 'Serie sin descripción',
    modality: first.modality || '—',
    ...classification,
    files: sorted.map((item) => item.file),
    fileCount: sorted.length,
    imageCount: sorted.reduce((sum, item) => sum + item.numberOfFrames, 0),
    dimensions: [first.columns, first.rows, sorted.reduce((sum, item) => sum + item.numberOfFrames, 0)],
    voxelSpacing: [first.pixelSpacing?.[1], first.pixelSpacing?.[0], zSpacing],
  };
}

export function buildDicomCatalog(records: IndexedDicomFile[], issues: Map<string, number>, scannedFiles: number): DicomCatalog {
  const groups = new Map<string, IndexedDicomFile[]>();
  for (const record of records) {
    const key = `${record.studyInstanceUid}\u0000${record.seriesInstanceUid}`;
    const group = groups.get(key) ?? [];
    group.push(record);
    groups.set(key, group);
  }

  const studies = new Map<string, DicomStudy>();
  for (const [key, items] of groups) {
    const [studyId, seriesId] = key.split('\u0000');
    const first = items[0];
    const study = studies.get(studyId) ?? {
      id: studyId,
      description: first.studyDescription || 'Estudio sin descripción',
      date: first.studyDate,
      manufacturer: first.manufacturer || 'No especificado',
      series: [],
    };
    study.series.push(buildSeries(studyId, seriesId, items));
    studies.set(studyId, study);
  }

  for (const study of studies.values()) {
    study.series.sort((a, b) => {
      const rank = (series: DicomSeries) => series.kind === 'volume' ? 0 : series.kind === 'localizer' ? 1 : 2;
      return rank(a) - rank(b) || b.imageCount - a.imageCount;
    });
  }

  return {
    studies: [...studies.values()].sort((a, b) => b.date.localeCompare(a.date)),
    issues: [...issues].map(([reason, count]) => ({ reason, count })),
    scannedFiles,
  };
}

export async function indexDicomFiles(
  files: File[],
  onProgress: (current: number, total: number) => void,
  signal?: AbortSignal,
): Promise<DicomCatalog> {
  const records: IndexedDicomFile[] = [];
  const issues = new Map<string, number>();
  const addIssue = (reason: string) => issues.set(reason, (issues.get(reason) ?? 0) + 1);

  for (let index = 0; index < files.length; index += 1) {
    if (signal?.aborted) throw new DOMException('Indexación cancelada', 'AbortError');
    const file = files[index];
    const upperName = file.name.toUpperCase();
    if (upperName === 'DICOMDIR') addIssue('DICOMDIR reservado para una fase posterior');
    else if (!isPotentialDicom(file)) addIssue('Archivo auxiliar ignorado');
    else {
      try {
        const metadata = await parseFile(file);
        if (!metadata.studyInstanceUid || !metadata.seriesInstanceUid) addIssue('DICOM sin identificadores de estudio o serie');
        else if (!metadata.hasPixelData) addIssue('Objeto DICOM sin datos de píxel');
        else records.push(metadata);
      } catch {
        addIssue('Archivo no DICOM o DICOM Part 10 inválido');
      }
    }
    onProgress(index + 1, files.length);
    if (index % 8 === 7) await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }

  return buildDicomCatalog(records, issues, files.length);
}

export function formatDicomDate(value: string): string {
  if (!/^\d{8}$/.test(value)) return value || 'Fecha no especificada';
  return `${value.slice(6, 8)}/${value.slice(4, 6)}/${value.slice(0, 4)}`;
}

export function formatSpacing(value?: number): string {
  return value === undefined ? '—' : value.toFixed(value < 0.1 ? 3 : 2).replace(/0+$/, '').replace(/\.$/, '');
}
