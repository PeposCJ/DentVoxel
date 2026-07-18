# Contributing to DentVoxel

Thank you for helping build a lightweight, private, and vendor-neutral dental imaging
viewer.

## Development workflow

1. Create a focused branch for one change.
2. Keep clinical files, patient information, secrets, and generated dependencies out of Git.
3. Add or update tests for behavioral changes.
4. Run the required checks before opening a pull request:

```bash
pnpm test
pnpm build
```

Pull requests should explain the user impact, technical decisions, verification steps,
and any interoperability or safety limitations. Changes to the viewer core remain under
MPL-2.0. Discuss large architectural changes before replacing established components.
