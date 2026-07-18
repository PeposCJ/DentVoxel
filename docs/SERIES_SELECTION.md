# Study and series selection

## First-version scope

When a folder is opened, DentVoxel examines DICOM headers locally before creating a
volume. It groups each instance by `StudyInstanceUID` and `SeriesInstanceUID`, orders
slices by physical position, and enables opening only compatible volumetric series.
Cornerstone receives exclusively the `File` objects from the selected series.

Indexing is sequential to limit peak memory use. DentVoxel first reads up to 4 MiB from
each file and stops at `PixelData`; it retries with the complete file only when an
unusually large header requires it. The user can cancel between files and can also
cancel volume preparation. Progress is reported as explicit stages: header reading,
classification, imaging-engine initialization, slice registration, volume construction,
pixel decoding, and rendering. Cancellation returns to the previous usable state and
shows a localized confirmation instead of leaving a stalled progress dialog.

## Classification

- **Volume:** at least two single-frame instances with pixel data, spatial geometry,
  consistent dimensions and spacing, and a transfer syntax supported by the bundled
  Cornerstone codecs.
- **Localizer:** `ImageType` or the series description contains a common indicator such
  as `LOCALIZER`, `SCOUT`, `TOPOGRAM`, `SURVIEW`, or `PROJECTION`. The localizer remains
  visible but is never mixed into the reconstructed volume.
- **Incompatible:** multiframe data, a modality other than CT, incomplete geometry,
  inconsistent dimensions or spacing, a single image, or an unsupported transfer
  syntax.
- **Ignored:** DICOMDIR, small or hidden auxiliary files, objects without pixel data,
  non-DICOM files, and objects missing the required UIDs. The interface shows counts
  and reasons, but not file names.

The supported syntax list reflects the currently bundled decoders: uncompressed little
and big endian, selected baseline and lossless JPEG processes, JPEG-LS, JPEG 2000,
HTJ2K, and RLE. A syntax outside this list remains visible as an incompatibility with
its UID instead of failing later during volume loading.

The selector also presents an aggregate classification summary. It reports the number
of files examined, DICOM objects indexed, usable volume slices, separated files, volume
series, localizers, and incompatible series. It intentionally does not list filenames.

## Adaptive large-volume previews

Valid single-frame volumes are no longer rejected solely because of their size. Before
opening a series, DentVoxel derives a local voxel budget from the browser's coarse
device-memory signal, bounded between conservative minimum and maximum limits. If the
source exceeds that budget, the selector offers a clearly labelled reduced preview.

Reduction uses powers of two and Cornerstone's native decimated-volume loader. Slices
are sampled along the stack and pixels are reduced in-plane before the final voxel
buffer is allocated. Dimensions and spacing are adjusted in all three axes, while the
original `File` objects remain untouched. Every viewport, the study header, and the
status bar retain a warning that the displayed volume is not full resolution. This is
a memory-safety and navigation feature, not a substitute for examining source data at
full resolution.

## Metadata and privacy

The interface uses only study description and date, manufacturer, series description
and modality, slice count, dimensions, and voxel spacing. It does not access or display
`PatientName`, `PatientID`, date of birth, or other identity fields. Metadata, files,
and pixels remain in memory on the device; this feature adds no persistence, telemetry,
or network communication.

## Decisions and known limitations

- UIDs are the only grouping keys. Folder and file names never determine series membership.
- Inter-slice spacing is the median distance projected onto the image normal. When it
  cannot be calculated, `SpacingBetweenSlices` and then `SliceThickness` are used as fallbacks.
- DICOMDIR and Enhanced CT/multiframe are identified clearly but remain unsupported in
  this iteration.
- Compatibility must be validated with anonymized CBCT data from multiple manufacturers.
  Clinical studies must not be committed; future fixtures must be synthetic or explicitly
  authorized and de-identified.
- Classification describes technical interoperability. It does not make DentVoxel a
  validated medical device or replace professional clinical verification.

## Next validation step

Follow [CBCT compatibility testing](COMPATIBILITY_TESTING.md) with local, untracked,
authorized anonymized studies. Publish only aggregate non-identifying results.
