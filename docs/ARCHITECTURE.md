# Architecture

## Primary decision: local-first

The browser receives `File` objects selected by the user. A local index extracts safe
DICOM metadata and groups instances before the selected series is registered with the
image loader. Pixel data is decoded in Web Workers, and the rendering engine builds one
in-memory volume shared by four WebGL viewports. No clinical file crosses the network.

```text
DICOM folder -> local metadata index -> selected study and series
                                           |
                                           `-> loader + WASM codecs -> in-memory volume
                                                                         |-> axial
                                                                         |-> coronal
                                                                         |-> sagittal
                                                                         `-> 3D rendering
```

The Crosshairs tool maintains one physical 3D point. Moving its center aligns all three
planes, while its rotation handles create oblique slices that follow dental anatomy.
The mouse wheel navigates slices, and window/level, pan, and zoom operate on the active
viewport.

## Layers

- `src/App.tsx`: application experience, language state, loading states, and controls.
- `src/i18n.ts`: English and Spanish user-facing messages.
- `src/lib/dicomCatalog.ts`: local header reading, grouping, classification, and safe metadata.
- `src/lib/cornerstone.ts`: initialization, volume lifecycle, viewports, and tools.
- Cornerstone3D and VTK.js: physical coordinates, WebGL, MPR, and volume rendering.
- DICOM Image Loader: DICOM Part 10 parsing, WASM codecs, and worker-based decoding.
- PWA: viewer resources remain available offline after the first visit.

The catalog retains `File` references only in memory and passes only the selected series
to Cornerstone. It does not persist the catalog or expose patient identity fields in the
interface. Classification rules and limitations are documented in
[SERIES_SELECTION.md](SERIES_SELECTION.md).

## Future distribution

A Tauri wrapper can reuse the same interface for a signed desktop application and `.dcm`
file association without bundling another Chromium runtime. The core must remain
independent from accounts and licensing; premium capabilities will connect through a
stable, separate module API.
