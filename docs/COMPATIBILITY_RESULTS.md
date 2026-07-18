# Preliminary compatibility results

These results describe technical interoperability tests with locally held, authorized
studies. They contain no patient identity fields, DICOM UIDs, filenames, screenshots,
or free-text clinical metadata. They are not diagnostic validation or a medical-device
compatibility claim.

## Carestream Dental — preliminary local results

Test environment: Windows, Chromium-based browser, approximately 16 GiB system memory.
All three exports used JPEG Lossless, Non-Hierarchical, First-Order Prediction
(`1.2.840.10008.1.2.4.70`).

| Case | Technical content | Catalog result | Rendering result |
| --- | --- | --- | --- |
| 1 | 325 CT slices, 401 × 401 × 325, 0.3 mm isotropic | One compatible volume; six auxiliary files separated | Pass: axial, coronal, sagittal, 3D bone rendering, crosshairs, tool switching, and reset |
| 2 | 650 CT slices in two 401 × 401 × 325 volumes, 0.3 mm isotropic | Two compatible volumes; nine auxiliary files separated | Not repeated; both series use the geometry and syntax already rendered in case 1 |
| 3 | 651-slice CT volume at 811 × 811 × 651 and 0.15 mm; 12 localizers; 6 multiframe DX objects | One compatible volume; localizers separated; multiframe objects reported as unsupported | Pass for reduced preview: adaptive 2× reduction to approximately 53 million voxels; axial, coronal, sagittal, 3D bone, crosshairs, reset, and English/Spanish warnings verified |

Header indexing completed successfully for all 1,644 DICOM objects across 1,683 files.
The browser test
for case 1 found and fixed two integration defects before this result was recorded:

- Local `dicomfile:` datasets now populate the DICOM Image Loader metadata cache before
  Cornerstone constructs a streaming volume.
- Cleanup now checks whether a volume reached the cache before removing it and purges
  local dataset memory safely after failure, cancellation, or replacement.

The initial fixed safety block has been replaced by an adaptive local preview policy.
The browser's coarse device-memory class selects a bounded voxel budget; volumes above
it use Cornerstone's native in-plane decimation plus stack sampling before the final
voxel buffer is allocated. Case 3 selected a 2× factor, rendered all four views without
console errors, and kept reduced-resolution warnings visible in the selector, header,
every viewport, and status bar. Original files remained unchanged and local.

## Interpretation

The first export is a preliminary pass for the complete basic viewing workflow. The
second export was not rendered again; the third passed the reduced-preview workflow
while its auxiliary multiframe DX objects remain unsupported. More independent cases,
scanner models, export software versions, operating systems, and browsers are required
before publishing a general Carestream compatibility statement.
