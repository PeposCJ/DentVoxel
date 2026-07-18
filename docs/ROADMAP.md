# Roadmap

## Phase 0 — technical alpha

- Open a local folder of DICOM slices.
- Synchronized axial, coronal, and sagittal MPR.
- Oblique slicing through crosshair rotation.
- Window/level, pan, zoom, scrolling, and camera reset.
- 3D volume rendering with a bone preset.
- Local-first PWA with a reproducible production build.
- English and Spanish interface.

## Phase 1 — dependable clinical viewer

- Group and select studies and series instead of assuming a single series. The first
  functional version is complete; validation with anonymized real-world studies and
  DICOMDIR support remain pending.
- Read DICOMDIR and multiframe objects and report unsupported transfer syntaxes clearly.
- Add dental presets, linear/angular measurements, and screenshot export.
- Implement curved planar reformation and cross-sectional views of the dental arch.
- Test CBCT studies from multiple manufacturers and publish a DICOM conformance statement.
- Loading and indexing cancellation, staged progress, and an initial 256 Mi-voxel
  safety limit are available. Adaptive memory limits and standardized local performance
  measurements remain pending.

## Phase 2 — distribution

- Signed Tauri application for Windows, macOS, and Linux with file association.
- Signed updates, fully offline mode, and optional DICOMweb support.
- Accessibility, additional languages, and a user manual.

## Phase 3 — advanced modules

- Clinician-editable mandibular canal assistance with explicit human confirmation.
- Dental segmentation and implant planning.
- Hardware-accelerated local inference where supported.
- Traceability for model, dataset, version, and every generated result.

Mandibular canal detection will be presented as **assistance**, never as automatic truth.
It requires a representative dataset, expert annotation, external validation across
manufacturers, uncertainty calibration, and a dedicated regulatory pathway.
