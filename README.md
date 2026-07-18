# DentVoxel

**Open-source dental CBCT and DICOM viewer. Fast, private, and local-first.**

DentVoxel opens a local DICOM folder directly in the browser, builds the volume in
memory, and displays synchronized axial, coronal, and sagittal views alongside a 3D
volume rendering. It is designed to give dental professionals a lightweight,
vendor-neutral alternative to the large viewers distributed with individual scanners.

> **Technical alpha. DentVoxel is not a validated medical device and must not be the
> sole basis for diagnosis, treatment planning, or clinical decisions.**

## Current features

- Local DICOM Part 10 loading without uploading clinical files.
- Study and series selection based on DICOM metadata.
- Separation of localizers, scout views, auxiliary files, and incompatible series.
- Synchronized axial, coronal, and sagittal MPR views.
- Crosshair translation and rotation for oblique slices.
- Window/level, pan, zoom, slice scrolling, and camera reset.
- 3D volume rendering with a bone preset.
- Web Worker decoding with WebAssembly codecs.
- Installable PWA that remains available offline after its first load.
- English and Spanish interface, with English as the default.

## Run locally

Requirements: Node.js 22 and pnpm 11.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:5173`, select **Open study**, and choose the folder containing
the DICOM slices. A folder or its files can also be dropped onto the viewer.

Build and verify the distributable version:

```bash
pnpm test
pnpm build
pnpm preview
```

## Privacy

The MVP has no backend, user accounts, or telemetry. `File` objects, metadata, and
decoded pixels remain in memory on the local device. Interface resources are bundled
locally and the viewer does not request external fonts.

Do not upload patient studies, identifiable screenshots, or credentials to the
repository or public issues. See [SECURITY.md](SECURITY.md).

## Product direction

- [Architecture](docs/ARCHITECTURE.md)
- [Study and series selection](docs/SERIES_SELECTION.md)
- [CBCT compatibility testing](docs/COMPATIBILITY_TESTING.md)
- [Clinical and technical roadmap](docs/ROADMAP.md)
- [Open-core product model](docs/PRODUCT.md)
- [Contributing](CONTRIBUTING.md)

The next priority is interoperability rather than AI: validate anonymized studies from
multiple manufacturers, improve series selection, and implement curved dental panoramic
reformation.

## License

MPL-2.0. Improvements to the open core remain open, while separate modules may use
another compatible license. This supports a strong community viewer and optional
commercial functionality without closing the basic imaging workflow.
