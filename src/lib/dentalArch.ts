export type Point3 = readonly [number, number, number];

export interface DentalArchCurve {
  controlPoints: Point3[];
  confirmed: boolean;
}

export interface DentalArchSample {
  distanceMm: number;
  position: Point3;
  tangent: Point3;
  normal: Point3;
}

const EPSILON = 1e-8;

function subtract(a: Point3, b: Point3): Point3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function length(vector: Point3): number {
  return Math.hypot(vector[0], vector[1], vector[2]);
}

function normalize(vector: Point3): Point3 {
  const magnitude = length(vector);
  if (magnitude < EPSILON) throw new Error('A direction vector cannot have zero length.');
  return [vector[0] / magnitude, vector[1] / magnitude, vector[2] / magnitude];
}

function cross(a: Point3, b: Point3): Point3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function interpolate(a: Point3, b: Point3, fraction: number): Point3 {
  return [
    a[0] + (b[0] - a[0]) * fraction,
    a[1] + (b[1] - a[1]) * fraction,
    a[2] + (b[2] - a[2]) * fraction,
  ];
}

function validatePoint(point: Point3): void {
  if (point.length !== 3 || point.some((value) => !Number.isFinite(value))) {
    throw new Error('Dental arch points must contain three finite world coordinates.');
  }
}

export function createDentalArch(controlPoints: Point3[]): DentalArchCurve {
  if (controlPoints.length < 2) throw new Error('A dental arch requires at least two control points.');
  controlPoints.forEach(validatePoint);
  return { controlPoints: controlPoints.map((point) => [...point] as Point3), confirmed: false };
}

export function moveDentalArchPoint(curve: DentalArchCurve, index: number, point: Point3): DentalArchCurve {
  validatePoint(point);
  if (!Number.isInteger(index) || index < 0 || index >= curve.controlPoints.length) {
    throw new Error('Dental arch control point index is out of range.');
  }
  const controlPoints = curve.controlPoints.map((current, currentIndex) =>
    currentIndex === index ? [...point] as Point3 : current,
  );
  return { controlPoints, confirmed: false };
}

export function confirmDentalArch(curve: DentalArchCurve): DentalArchCurve {
  return { controlPoints: curve.controlPoints, confirmed: true };
}

export function sampleDentalArch(
  curve: DentalArchCurve,
  spacingMm: number,
  planeNormal: Point3,
): DentalArchSample[] {
  if (!Number.isFinite(spacingMm) || spacingMm <= 0) throw new Error('Sample spacing must be positive.');
  const normalizedPlaneNormal = normalize(planeNormal);
  const segments = curve.controlPoints.slice(0, -1).map((start, index) => {
    const end = curve.controlPoints[index + 1];
    const vector = subtract(end, start);
    const segmentLength = length(vector);
    if (segmentLength < EPSILON) throw new Error('Adjacent dental arch control points must be distinct.');
    return { start, end, length: segmentLength, tangent: normalize(vector) };
  });
  const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0);
  const distances: number[] = [];
  for (let distance = 0; distance < totalLength; distance += spacingMm) distances.push(distance);
  distances.push(totalLength);

  return distances.map((distanceMm) => {
    let traversed = 0;
    let segment = segments[segments.length - 1];
    for (const candidate of segments) {
      segment = candidate;
      if (distanceMm <= traversed + candidate.length + EPSILON) break;
      traversed += candidate.length;
    }
    const fraction = Math.min(1, Math.max(0, (distanceMm - traversed) / segment.length));
    const normal = normalize(cross(normalizedPlaneNormal, segment.tangent));
    return {
      distanceMm,
      position: interpolate(segment.start, segment.end, fraction),
      tangent: segment.tangent,
      normal,
    };
  });
}
