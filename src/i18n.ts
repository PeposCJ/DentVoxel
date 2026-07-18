export type Language = 'en' | 'es';

const messages = {
  en: {
    axial: 'AXIAL', coronal: 'CORONAL', sagittal: 'SAGITTAL', volume3d: '3D VOLUME',
    viewerTools: 'Viewer tools', crosshairs: 'Crosshairs', windowLevel: 'Window/level', pan: 'Pan', zoom: 'Zoom', reset: 'Reset', fullscreen: 'Fullscreen',
    localViewer: 'Local dental viewer', studiesStayLocal: 'Studies never leave this device', privateNoCloud: 'Private and cloud-free', openStudy: 'Open study',
    alpha: 'DENTVOXEL · ALPHA', welcomeTitle: 'Open a dental scan.', welcomeAccent: 'No installation required.',
    welcomeCopy: 'Select the folder containing the CBCT study. Images are processed exclusively on this device.',
    selectDicomFolder: 'Select DICOM folder', dropHint: 'You can also drop the folder or its files here',
    indexing: 'Identifying studies and series…', loadingVolume: 'Preparing volume…', cancel: 'Cancel',
    localDicomContent: 'LOCAL DICOM CONTENT', chooseSeries: 'Choose a series to open', closeSelector: 'Close series selector', study: 'Study',
    studyDescription: 'Study description', date: 'Date', manufacturer: 'Manufacturer', series: 'Series',
    privacyNote: 'Patient name, identifier and other personal details are intentionally omitted.',
    separatedFiles: '{{count}} files separated or ignored', slices: '{{count}} slices', pixels: '{{value}} px', millimeters: '{{value}} mm',
    open: 'Open', localizer: 'Localizer', incompatible: 'Not compatible',
    studyLoaded: 'Study loaded', seriesIndexed: 'Series indexed locally', processingLocal: 'Processing on this device', readyToOpen: 'Ready to open a study',
    localProcessing: '{{count}} slices · local processing', synchronizedMpr: 'Synchronized MPR + 3D',
    viewerHelp: 'Wheel: browse slices · Drag: active tool', selectedSlices: '{{count}} selected slices', filesProgress: '{{current}} of {{total}} files',
    noUsableSeries: 'No usable DICOM series were found.', inspectFolderFailed: 'This folder could not be examined.',
    viewerNotReady: 'The viewer is not ready yet.', openSeriesFailed: 'This series could not be opened.', genericOpenError: 'This study could not be opened.',
    untitledStudy: 'Untitled study', untitledSeries: 'Untitled series', unspecified: 'Not specified', unspecifiedDate: 'Date not specified', localStudy: 'Local study',
    localizerReason: 'Localizer view separated from the volume', multiframeReason: 'Multiframe DICOM is not supported yet',
    noPixelDataReason: 'The series contains objects without pixel data', tooFewSlicesReason: 'At least two slices are required to reconstruct a volume',
    unsupportedSyntaxReason: 'Unsupported transfer syntax: {{syntax}}', modalityReason: '{{modality}} modality is not compatible with dental CBCT volumes',
    incompleteGeometryReason: 'Incomplete DICOM spatial geometry', inconsistentDimensionsReason: 'Inconsistent slice dimensions',
    inconsistentSpacingReason: 'Inconsistent pixel spacing', inconsistentOrientationReason: 'Inconsistent slice orientation',
    dicomdirIssue: 'DICOMDIR is reserved for a future release', auxiliaryIssue: 'Auxiliary file ignored',
    missingIdentifiersIssue: 'DICOM object without study or series identifiers', noPixelIssue: 'DICOM object without pixel data',
    invalidDicomIssue: 'Non-DICOM file or invalid DICOM Part 10 object', indexingCancelled: 'Indexing cancelled', loadCancelled: 'Loading cancelled',
    toolGroupError: 'The viewer tool group could not be created.', insufficientDicom: 'Not enough DICOM slices were found in the folder.',
    language: 'Language', english: 'English', spanish: 'Español',
  },
  es: {
    axial: 'AXIAL', coronal: 'CORONAL', sagittal: 'SAGITAL', volume3d: 'VOLUMEN 3D',
    viewerTools: 'Herramientas del visor', crosshairs: 'Cruceta', windowLevel: 'Contraste', pan: 'Mover', zoom: 'Zoom', reset: 'Recentrar', fullscreen: 'Pantalla',
    localViewer: 'Visor dental local', studiesStayLocal: 'Los estudios nunca salen de este equipo', privateNoCloud: 'Privado y sin nube', openStudy: 'Abrir estudio',
    alpha: 'DENTVOXEL · ALFA', welcomeTitle: 'Abre una tomografía.', welcomeAccent: 'Sin instalar nada.',
    welcomeCopy: 'Selecciona la carpeta del estudio CBCT. Las imágenes se procesan exclusivamente en este dispositivo.',
    selectDicomFolder: 'Seleccionar carpeta DICOM', dropHint: 'También puedes arrastrar la carpeta o sus archivos aquí',
    indexing: 'Identificando estudios y series…', loadingVolume: 'Preparando el volumen…', cancel: 'Cancelar',
    localDicomContent: 'CONTENIDO DICOM LOCAL', chooseSeries: 'Elige la serie que deseas abrir', closeSelector: 'Cerrar selector de series', study: 'Estudio',
    studyDescription: 'Descripción del estudio', date: 'Fecha', manufacturer: 'Fabricante', series: 'Series',
    privacyNote: 'Se omiten nombre, identificador y demás datos personales del paciente.',
    separatedFiles: '{{count}} archivos separados o ignorados', slices: '{{count}} cortes', pixels: '{{value}} px', millimeters: '{{value}} mm',
    open: 'Abrir', localizer: 'Localizador', incompatible: 'No compatible',
    studyLoaded: 'Estudio cargado', seriesIndexed: 'Series indexadas localmente', processingLocal: 'Procesando en este dispositivo', readyToOpen: 'Listo para abrir un estudio',
    localProcessing: '{{count}} cortes · procesamiento local', synchronizedMpr: 'MPR sincronizado + 3D',
    viewerHelp: 'Rueda: navegar cortes · Arrastrar: herramienta activa', selectedSlices: '{{count}} cortes seleccionados', filesProgress: '{{current}} de {{total}} archivos',
    noUsableSeries: 'No se encontraron series DICOM utilizables.', inspectFolderFailed: 'No fue posible examinar esta carpeta.',
    viewerNotReady: 'El visor todavía no está listo.', openSeriesFailed: 'No fue posible abrir esta serie.', genericOpenError: 'No fue posible abrir este estudio.',
    untitledStudy: 'Estudio sin descripción', untitledSeries: 'Serie sin descripción', unspecified: 'No especificado', unspecifiedDate: 'Fecha no especificada', localStudy: 'Estudio local',
    localizerReason: 'Vista de localización separada del volumen', multiframeReason: 'DICOM multiframe aún no soportado',
    noPixelDataReason: 'La serie contiene objetos sin datos de píxel', tooFewSlicesReason: 'Se requieren al menos dos cortes para reconstruir un volumen',
    unsupportedSyntaxReason: 'Sintaxis de transferencia no soportada: {{syntax}}', modalityReason: 'La modalidad {{modality}} no es compatible con volúmenes CBCT dentales',
    incompleteGeometryReason: 'Geometría espacial DICOM incompleta', inconsistentDimensionsReason: 'Dimensiones de corte inconsistentes',
    inconsistentSpacingReason: 'Espaciado de píxel inconsistente', inconsistentOrientationReason: 'Orientación de cortes inconsistente',
    dicomdirIssue: 'DICOMDIR está reservado para una fase posterior', auxiliaryIssue: 'Archivo auxiliar ignorado',
    missingIdentifiersIssue: 'Objeto DICOM sin identificadores de estudio o serie', noPixelIssue: 'Objeto DICOM sin datos de píxel',
    invalidDicomIssue: 'Archivo no DICOM u objeto DICOM Part 10 inválido', indexingCancelled: 'Indexación cancelada', loadCancelled: 'Carga cancelada',
    toolGroupError: 'No se pudo crear el grupo de herramientas del visor.', insufficientDicom: 'No se encontraron suficientes cortes DICOM en la carpeta.',
    language: 'Idioma', english: 'English', spanish: 'Español',
  },
} as const;

export type TranslationKey = keyof typeof messages.en;
export type TranslationValues = Record<string, string | number>;
export interface MessageDescriptor { key: TranslationKey; values?: TranslationValues }

export function translate(language: Language, key: TranslationKey, values: TranslationValues = {}): string {
  let message: string = messages[language][key];
  for (const [name, value] of Object.entries(values)) message = message.replaceAll(`{{${name}}}`, String(value));
  return message;
}

export function localize(language: Language, message?: MessageDescriptor): string {
  return message ? translate(language, message.key, message.values) : '';
}
