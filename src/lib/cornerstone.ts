import {
  Enums as CoreEnums,
  RenderingEngine,
  cache,
  decimatedVolumeLoader,
  init as initCore,
  setVolumesForViewports,
  volumeLoader,
} from '@cornerstonejs/core';
import { init as initDicomLoader, wadouri } from '@cornerstonejs/dicom-image-loader';
import {
  addTool,
  CrosshairsTool,
  Enums as ToolEnums,
  init as initTools,
  PanTool,
  StackScrollTool,
  ToolGroupManager,
  WindowLevelTool,
  ZoomTool,
} from '@cornerstonejs/tools';
import { translate, type Language } from '../i18n';
import { isPotentialDicom } from './files';

export type ToolName = 'Crosshairs' | 'WindowLevel' | 'Pan' | 'Zoom';

export interface VolumeLoadProgress {
  stage: 'initializing' | 'registering' | 'building' | 'decoding' | 'rendering';
  percent: number;
  current?: number;
  total?: number;
}

export const VIEWPORT_IDS = ['axial', 'coronal', 'sagittal', 'volume3d'] as const;
const MPR_IDS = VIEWPORT_IDS.slice(0, 3);
const ENGINE_ID = 'dentvoxel-engine';
const TOOL_GROUP_ID = 'dentvoxel-mpr-tools';
let initialized = false;
let engine: RenderingEngine | undefined;
let activeVolumeId: string | undefined;
let activeVolumeCancel: (() => void) | undefined;
let activeAbortSignal: AbortSignal | undefined;

async function prepareLocalMetadata(
  imageIds: string[],
  onProgress: (progress: VolumeLoadProgress) => void,
  throwIfCancelled: () => void,
): Promise<void> {
  let nextIndex = 0;
  let completed = 0;
  const worker = async () => {
    while (nextIndex < imageIds.length) {
      const imageId = imageIds[nextIndex];
      nextIndex += 1;
      throwIfCancelled();
      const parsed = wadouri.parseImageId(imageId);
      await wadouri.dataSetCacheManager.load(parsed.url, wadouri.loadFileRequest, imageId);
      completed += 1;
      onProgress({
        stage: 'registering',
        percent: 8 + Math.round((completed / imageIds.length) * 14),
        current: completed,
        total: imageIds.length,
      });
    }
  };

  await Promise.all(Array.from({ length: Math.min(4, imageIds.length) }, worker));
  throwIfCancelled();
}

export async function initializeImaging(): Promise<void> {
  if (initialized) return;
  await initCore();
  await initDicomLoader({
    maxWebWorkers: Math.max(1, Math.min(4, Math.floor((navigator.hardwareConcurrency || 2) / 2))),
  });
  await initTools();
  volumeLoader.registerVolumeLoader(
    'cornerstoneDecimatedVolume',
    decimatedVolumeLoader as unknown as Parameters<typeof volumeLoader.registerVolumeLoader>[1],
  );
  [CrosshairsTool, WindowLevelTool, PanTool, ZoomTool, StackScrollTool].forEach(addTool);
  initialized = true;
}

function configureTools(language: Language) {
  ToolGroupManager.destroyToolGroup(TOOL_GROUP_ID);
  const group = ToolGroupManager.createToolGroup(TOOL_GROUP_ID);
  if (!group) throw new Error(translate(language, 'toolGroupError'));

  group.addTool(CrosshairsTool.toolName, {
    getReferenceLineColor: (id: string) =>
      id === 'axial' ? '#53d4ff' : id === 'coronal' ? '#a8ef80' : '#ffb36b',
    getReferenceLineControllable: () => true,
    getReferenceLineDraggableRotatable: () => true,
    getReferenceLineSlabThicknessControlsOn: () => true,
  });
  group.addTool(WindowLevelTool.toolName);
  group.addTool(PanTool.toolName);
  group.addTool(ZoomTool.toolName);
  group.addTool(StackScrollTool.toolName);

  MPR_IDS.forEach((id) => group.addViewport(id, ENGINE_ID));
  group.setToolActive(CrosshairsTool.toolName, {
    bindings: [{ mouseButton: ToolEnums.MouseBindings.Primary }],
  });
  group.setToolActive(StackScrollTool.toolName, {
    bindings: [{ mouseButton: ToolEnums.MouseBindings.Wheel }],
  });
}

export async function loadDicomStudy(
  files: File[],
  elements: Record<(typeof VIEWPORT_IDS)[number], HTMLDivElement>,
  onProgress: (progress: VolumeLoadProgress) => void,
  signal?: AbortSignal,
  language: Language = 'en',
  decimation = 1,
): Promise<{ images: number; description: string }> {
  const throwIfCancelled = () => {
    if (signal?.aborted) throw new DOMException(translate(language, 'loadCancelled'), 'AbortError');
  };

  throwIfCancelled();
  onProgress({ stage: 'initializing', percent: 2 });
  await initializeImaging();
  throwIfCancelled();
  destroyStudy();

  const candidates = files.filter(isPotentialDicom);
  if (candidates.length < 2) {
    throw new Error(translate(language, 'insufficientDicom'));
  }

  const imageIds = candidates.map((file) => wadouri.fileManager.add(file));
  const selectedImageIds = decimation > 1
    ? imageIds.filter((_, index) => index % decimation === 0)
    : imageIds;
  const metadataImageIds = decimation > 1
    ? selectedImageIds.map((imageId) => `${imageId}#decimation=${decimation}`)
    : selectedImageIds;
  onProgress({ stage: 'registering', percent: 8, current: 0, total: metadataImageIds.length });
  await prepareLocalMetadata(metadataImageIds, onProgress, throwIfCancelled);

  engine = new RenderingEngine(ENGINE_ID);
  engine.setViewports([
    {
      viewportId: 'axial',
      type: CoreEnums.ViewportType.ORTHOGRAPHIC,
      element: elements.axial,
      defaultOptions: { orientation: CoreEnums.OrientationAxis.AXIAL, background: [0.015, 0.025, 0.035] },
    },
    {
      viewportId: 'coronal',
      type: CoreEnums.ViewportType.ORTHOGRAPHIC,
      element: elements.coronal,
      defaultOptions: { orientation: CoreEnums.OrientationAxis.CORONAL, background: [0.015, 0.025, 0.035] },
    },
    {
      viewportId: 'sagittal',
      type: CoreEnums.ViewportType.ORTHOGRAPHIC,
      element: elements.sagittal,
      defaultOptions: { orientation: CoreEnums.OrientationAxis.SAGITTAL, background: [0.015, 0.025, 0.035] },
    },
    {
      viewportId: 'volume3d',
      type: CoreEnums.ViewportType.VOLUME_3D,
      element: elements.volume3d,
      defaultOptions: { background: [0.015, 0.025, 0.035] },
    },
  ]);
  configureTools(language);
  onProgress({ stage: 'building', percent: 24 });

  activeVolumeId = `${decimation > 1 ? 'cornerstoneDecimatedVolume' : 'cornerstoneStreamingImageVolume'}:dentvoxel-${Date.now()}`;
  const volumeOptions = decimation > 1
    ? { imageIds: selectedImageIds, ijkDecimation: [decimation, decimation, 1] }
    : { imageIds: selectedImageIds };
  const volume = await volumeLoader.createAndCacheVolume(
    activeVolumeId,
    volumeOptions as Parameters<typeof volumeLoader.createAndCacheVolume>[1],
  );
  const cancelVolume = () => volume.cancelLoading();
  signal?.addEventListener('abort', cancelVolume, { once: true });
  activeVolumeCancel = cancelVolume;
  activeAbortSignal = signal;
  onProgress({ stage: 'decoding', percent: 25, current: 0, total: selectedImageIds.length });
  volume.load((evt) => {
    if (signal?.aborted) return;
    const detail = evt as unknown as { framesLoaded?: number; framesTotal?: number };
    if (detail.framesLoaded && detail.framesTotal) {
      onProgress({
        stage: 'decoding',
        percent: 25 + Math.round((detail.framesLoaded / detail.framesTotal) * 65),
        current: detail.framesLoaded,
        total: detail.framesTotal,
      });
    }
  });
  throwIfCancelled();
  await setVolumesForViewports(engine, [{ volumeId: activeVolumeId }], [...VIEWPORT_IDS]);
  throwIfCancelled();
  onProgress({ stage: 'rendering', percent: 94 });

  const threeD = engine.getViewport('volume3d');
  if ('setProperties' in threeD) {
    (threeD as { setProperties: (p: { preset: string }) => void }).setProperties({ preset: 'CT-Bone' });
  }
  engine.render();
  onProgress({ stage: 'rendering', percent: 100 });

  return {
    images: imageIds.length,
    description: candidates[0]?.webkitRelativePath?.split('/')[0] || translate(language, 'localStudy'),
  };
}

export function activateTool(tool: ToolName): void {
  const group = ToolGroupManager.getToolGroup(TOOL_GROUP_ID);
  if (!group) return;
  [CrosshairsTool, WindowLevelTool, PanTool, ZoomTool].forEach((candidate) =>
    group.setToolPassive(candidate.toolName),
  );
  const name =
    tool === 'Crosshairs' ? CrosshairsTool.toolName :
    tool === 'WindowLevel' ? WindowLevelTool.toolName :
    tool === 'Pan' ? PanTool.toolName : ZoomTool.toolName;
  group.setToolActive(name, { bindings: [{ mouseButton: ToolEnums.MouseBindings.Primary }] });
}

export function resetCameras(): void {
  if (!engine) return;
  VIEWPORT_IDS.forEach((id) => engine?.getViewport(id)?.resetCamera());
  engine.render();
}

export function destroyStudy(): void {
  activeVolumeCancel?.();
  if (activeAbortSignal && activeVolumeCancel) {
    activeAbortSignal.removeEventListener('abort', activeVolumeCancel);
  }
  activeVolumeCancel = undefined;
  activeAbortSignal = undefined;
  ToolGroupManager.destroyToolGroup(TOOL_GROUP_ID);
  engine?.destroy();
  engine = undefined;
  if (activeVolumeId && cache.getVolumeLoadObject(activeVolumeId)) {
    cache.removeVolumeLoadObject(activeVolumeId);
  }
  activeVolumeId = undefined;
  wadouri.dataSetCacheManager.purge();
  wadouri.fileManager.purge();
}
