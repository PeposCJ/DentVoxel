# CBCT compatibility testing

## Purpose

DentVoxel must be tested with authorized, anonymized studies before compatibility is
claimed for any scanner or export workflow. This protocol records interoperability
without adding clinical files or patient information to the repository.

Passing this protocol means that a study can be classified, opened, navigated, and
cancelled technically. It is not diagnostic validation and does not make DentVoxel a
medical device.

## Data handling rules

- Use only studies whose testing use has been authorized and whose anonymization has
  been independently verified.
- Keep every DICOM object, DICOMDIR, screenshot, filename, and local test log outside
  Git. The existing ignore rules cover `*.dcm`, `DICOMDIR`, and `studies/`.
- Do not record patient name, patient identifier, birth date, accession number, study
  UID, series UID, institution, or free-text fields that could identify a person.
- Publish only aggregate technical results. A failure report should contain synthetic
  metadata or the minimum non-identifying technical facts needed to reproduce it.
- Perform testing offline when possible and confirm that the browser makes no study
  upload or telemetry request.

## Initial coverage targets

These are test targets, not current compatibility claims.

| Export family | Minimum cases | Public status |
| --- | ---: | --- |
| Carestream Dental | 2 | Preliminary local results; not yet independently validated |
| Dentsply Sirona | 2 | Not yet independently validated |
| Planmeca | 2 | Not yet independently validated |
| Vatech | 2 | Not yet independently validated |
| NewTom | 2 | Not yet independently validated |
| DEXIS / i-CAT | 2 | Not yet independently validated |
| Other standards-compliant CT exports | 2 | Not yet independently validated |

Across the collection, include uncompressed little endian, JPEG lossless, JPEG-LS,
JPEG 2000, scout/localizer views, multiple series, multiple studies in one folder,
large volumes, DICOMDIR, multiframe data, and at least one deliberately unsupported
transfer syntax.

## Test procedure

1. Record the DentVoxel commit, browser version, operating system, installed memory,
   scanner family, export software version when known, transfer syntax UID, dimensions,
   voxel spacing, and file count. Do not record identity fields or DICOM UIDs.
2. Open the complete exported folder. Confirm that the progress display moves through
   header reading and study/series classification.
3. Compare the classification summary with an independent DICOM inventory: files
   examined, DICOM objects indexed, usable volume slices, separated files, volume
   series, localizers, and incompatible series.
4. Confirm that scouts and localizers remain visible but cannot be mixed into the
   volume. Confirm that every incompatible series has a specific reason.
5. Open each compatible volume. Verify axial, coronal, sagittal, and 3D rendering;
   slice order; orientation; dimensions; voxel spacing; crosshairs; window/level; pan;
   zoom; scrolling; and reset.
6. Cancel once during header reading and once during pixel decoding. Confirm that the
   application returns to a usable state and can reopen the folder without a reload.
7. Repeat the opening after taking the browser offline. Record peak memory and elapsed
   indexing/opening time using local developer tools only.

## Result categories

- **Pass:** classification and all four views behave as expected with no material
  metadata discrepancy.
- **Partial:** the main single-frame volume opens, but an auxiliary series, DICOMDIR,
  or another known feature is unsupported and is reported correctly.
- **Fail:** the expected volume is misclassified, ordered incorrectly, rendered with
  incorrect geometry, or cannot be opened.
- **Blocked:** authorization, anonymization, or an independent reference viewer is not
  available. Blocked data must not be used to claim compatibility.

## Safe result template

| Field | Result |
| --- | --- |
| DentVoxel commit |  |
| Scanner/export family |  |
| Export software version |  |
| Browser and operating system |  |
| Transfer syntax UID |  |
| Dimensions and voxel spacing |  |
| Files examined / DICOM indexed |  |
| Volume / localizer / incompatible series |  |
| Indexing time / opening time / peak memory |  |
| Cancellation during indexing / decoding | Pass / Fail |
| Offline opening | Pass / Fail |
| Overall result | Pass / Partial / Fail / Blocked |
| Non-identifying notes |  |

Automated repository tests use only synthetic metadata records. Real compatibility
results require the manual protocol because pixel decoding, geometry, and manufacturer
export behavior cannot be validated from fabricated headers alone.

See [Preliminary compatibility results](COMPATIBILITY_RESULTS.md) for aggregate findings
that have passed this privacy review.
