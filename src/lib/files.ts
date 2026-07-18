/** Excluye archivos de control y entradas vacías antes de pasarlas al parser DICOM. */
export function isPotentialDicom(file: Pick<File, 'name' | 'size'>): boolean {
  const name = file.name.toUpperCase();
  if (file.size <= 128) return false;
  if (name === 'DICOMDIR') return false;
  if (name.startsWith('.')) return false;
  return true;
}
