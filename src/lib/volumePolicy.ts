export interface VolumeLoadPlan {
  decimation: number;
  originalVoxels: number;
  previewVoxels: number;
  targetVoxels: number;
}

const DEFAULT_DEVICE_MEMORY_GIB = 4;
const MIN_TARGET_VOXELS = 32 * 1024 * 1024;
const MAX_TARGET_VOXELS = 160 * 1024 * 1024;
const VOXELS_PER_MEMORY_GIB = 12 * 1024 * 1024;
const SAFE_TEXTURE_DIMENSION = 2048;

export function getDeviceMemoryGiB(): number {
  if (typeof navigator === 'undefined') return DEFAULT_DEVICE_MEMORY_GIB;
  const reported = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return reported && Number.isFinite(reported) ? reported : DEFAULT_DEVICE_MEMORY_GIB;
}

export function planVolumeLoad(
  dimensions: [number | undefined, number | undefined, number],
  deviceMemoryGiB = DEFAULT_DEVICE_MEMORY_GIB,
): VolumeLoadPlan {
  const resolved = dimensions.map((value) => Math.max(1, value ?? 1)) as [number, number, number];
  const originalVoxels = resolved[0] * resolved[1] * resolved[2];
  const targetVoxels = Math.min(
    MAX_TARGET_VOXELS,
    Math.max(MIN_TARGET_VOXELS, Math.floor(deviceMemoryGiB * VOXELS_PER_MEMORY_GIB)),
  );
  let decimation = 1;

  while (
    originalVoxels / decimation ** 3 > targetVoxels ||
    Math.max(...resolved) / decimation > SAFE_TEXTURE_DIMENSION
  ) {
    decimation *= 2;
  }

  return {
    decimation,
    originalVoxels,
    previewVoxels: Math.max(1, Math.floor(resolved[0] / decimation)) *
      Math.max(1, Math.floor(resolved[1] / decimation)) *
      Math.ceil(resolved[2] / decimation),
    targetVoxels,
  };
}
