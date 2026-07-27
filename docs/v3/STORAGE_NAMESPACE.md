# Storage Namespace: `mk.viralcanvas.*.v1`

Wave 3 unified all localStorage keys under one namespace. Before this, keys
were split across two historical namespaces (`memelab-*` from the original app
name, `viralcanvas:v1:*` from the project-persistence work).

## Key map

| Data | Legacy key | Canonical key |
| --- | --- | --- |
| Templates + favorites (zustand) | `memelab-storage` | `mk.viralcanvas.memes.v1` |
| Settings (zustand) | `memelab-settings` | `mk.viralcanvas.settings.v1` |
| Stats (zustand) | `memelab-stats` | `mk.viralcanvas.stats.v1` |
| Saved project | `viralcanvas:v1:project:<id>` | `mk.viralcanvas.project.<id>.v1` |
| Last opened project id | `viralcanvas:v1:last-project-id` | `mk.viralcanvas.last-project-id.v1` |
| Export counter | `viralcanvas:v1:export-count` | `mk.viralcanvas.export-count.v1` |

Canonical key names are defined in `src/utils/storageKeys.ts` — nothing else
in the codebase hardcodes key strings.

## Migration (non-destructive)

`src/utils/storageMigration.ts` runs once per startup via
`src/bootstrapStorage.ts`, which **must stay the first import in
`src/main.tsx`**: persisted zustand stores hydrate from localStorage the
moment their modules are evaluated, so the copy has to happen before any
store module loads.

Behavior:

- **Copy, not move.** Legacy keys are left untouched.
- **New data wins.** A value already present at a canonical key is never
  overwritten, which also makes the migration idempotent.
- **Partial-failure safe.** A quota error on one value skips that value only;
  it is retried on the next startup.

## Removal plan (one-release grace period)

- **This release (v3):** both namespaces exist; the app reads and writes only
  `mk.viralcanvas.*.v1`. Legacy keys are still counted by the dashboard's
  storage estimate because they occupy real quota.
- **Next release (v3.x+1):** add a cleanup step that deletes `memelab-*` and
  `viralcanvas:v1:*` keys after a successful migration run, then remove the
  legacy constants from `storageKeys.ts` and this grace-period note.
