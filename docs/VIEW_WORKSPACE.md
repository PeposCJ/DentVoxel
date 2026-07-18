# Configurable viewing workspace

DentVoxel is evolving from its fixed four-panel grid into a configurable workspace.
The first version supports resizing, minimizing, restoring, and automatic redistribution
of the four existing viewports. This document also records the interaction model for
additional view types.

## View model

Each panel will have a stable identifier, a view type, a visibility state, and a size.
The initial types are axial, coronal, sagittal, and 3D volume. Future types are curved
panoramic reformation and dental-arch cross sections. Hiding or minimizing a panel must
not change the physical point shared by the synchronized views.

## Layout behavior

- Panel dividers are draggable and limited to 20â€“80 percent of the workspace.
- A panel can be minimized and restored without discarding its camera or annotations.
  A persistent **Views** selector lists every available viewport and can reopen any hidden
  view; the final visible viewport cannot be closed.
- Automatic layout chooses rows and columns from the visible panels and available aspect
  ratio. The default action also restores an even 50/50 split after manual resizing.
- Cornerstone viewports are explicitly resized after every layout or window-size change.
  Minimized panels remain attached at a negligible size so restoring them does not require
  rebuilding the volume or tool group.
- The default remains the familiar 2 by 2 MPR and 3D layout.

## Panoramic and cross-sectional views

The panoramic view will be derived locally from an editable curve placed along the
dental arch. It will not be generated until the clinician has accepted or adjusted the
curve. A compact locator will show the arch and a clearly visible marker for the current
cross-sectional position. Moving that marker, scrolling cross sections, or moving the
shared reference point will update the other views in physical patient coordinates.

The first panoramic implementation should separate three concerns:

1. an editable arch model stored in physical millimetres;
2. curved planar resampling with documented thickness and interpolation;
3. presentation state for the panorama, locator, and perpendicular cross sections.

This separation keeps future clinician-assisted arch or canal suggestions editable and
prevents an automatic result from being presented as definitive.

## Safety and privacy

Layouts and non-identifying preferences may be saved locally. Pixel data, measurements,
arch curves, screenshots, and clinical metadata will not be transmitted or persisted by
default. Measurements and reconstructions are aids that require professional verification;
DentVoxel remains an unvalidated technical alpha.
