/** Excludes control files and empty entries before passing them to the DICOM parser. */
export function isPotentialDicom(file: Pick<File, 'name' | 'size'>): boolean {
  const name = file.name.toUpperCase();
  if (file.size <= 128) return false;
  if (name === 'DICOMDIR') return false;
  if (name.startsWith('.')) return false;
  return true;
}
