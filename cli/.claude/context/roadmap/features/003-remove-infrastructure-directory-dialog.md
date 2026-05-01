---
status: in-progress
completed_date:
pr_url:
---

# Remove Infrastructure Directory Dialog — Always use `/infrastructure`

## Overview

The CLI currently prompts the user with "Use `/infrastructure` directory?" before proceeding. This dialog adds friction without meaningful value — the answer is always the same. This feature removes the prompt and instead displays a static informational message telling the user that the `/infrastructure` folder will be created, then proceeds automatically.

## What Changes

| Area                                      | Change                                                                                          |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `src/components/DirectoryDialog.tsx`      | Remove the `choose` step and its select input; replace with a static notice and auto-advance    |
| `src/app.tsx`                             | Wizard step 3 now resolves the directory automatically without waiting for user selection       |

## CLI Wizard Changes

### Before (current behaviour)

```sh
◆ Use `/infrastructure` directory?
│
│ ◉ Yes (directory exists - will ask to override)
│ ◯ No
└
```

If the user chose "Yes" and the directory existed and had files, a second prompt appeared:

```sh
⚠ Directory already exists
│ /path/to/infrastructure contains existing files.
│
◆ Use existing files?
│ ◉ Yes, use existing files
│ ◯ No, override existing files
└
```

### After (new behaviour)

The dialog is replaced by a non-interactive notice. No keypress is required; the wizard advances immediately after rendering:

```sh
◇ Using /infrastructure directory
│ The /infrastructure folder will be created in the current working directory.
└
```

- The `infrastructure` subdirectory of `process.cwd()` is always selected — the same value that "Yes" produced before.
- The `confirm-override` step is also removed. If the directory already exists and has files, the wizard falls through to `DownloadDialog` as before (existing override logic lives in `DownloadDialog`, not here).
- `useExisting` is always passed as `false` to `onSelect` — download proceeds unless `DownloadDialog` detects an existing config and short-circuits.

## Interfaces touched

### `DirectoryDialog` component

**Before:** Exported a component that rendered a two-step interactive select. Callers waited for `onSelect(dir, useExisting)` to be called by user action.

**After:** Exported a component that renders a single static notice and calls `onSelect(infrastructureDir, false)` in a `useEffect` on mount (or immediately in the render path). The `Props` interface and `onSelect` signature are unchanged so `app.tsx` requires no structural edits.

### `app.tsx` — step 3

No change to the call site. The `DirectoryDialog` API (`onSelect`) is preserved.

## Data flow

1. Wizard reaches step 3 (`!directory`).
2. `DirectoryDialog` mounts, derives `infrastructureDir = path.join(process.cwd(), 'infrastructure')`, and immediately calls `onSelect(infrastructureDir, false)`.
3. A brief notice is rendered while the effect fires (or the component may call `onSelect` synchronously and render nothing).
4. `app.tsx` sets `directory` state and advances to step 4 (`DownloadDialog`).

## Acceptance criteria

- [ ] Running `iac-toolbox` no longer shows a "Use `/infrastructure` directory?" select prompt
- [ ] The wizard displays a non-interactive notice indicating it will use the `/infrastructure` folder
- [ ] After the notice, the wizard automatically advances to the download step without user input
- [ ] The resolved directory is always `<cwd>/infrastructure` (same as the previous "Yes" choice)
- [ ] `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:ci && pnpm build` all exit 0

## Validation

Run the full validation suite from `CLAUDE.md`:

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test:ci
pnpm build
```

Then manually run `iac-toolbox` and confirm the directory dialog is gone and the wizard proceeds to the download step automatically.

## Out of Scope

- Supporting a custom directory path via CLI flag — deferred; always use `infrastructure/` for now
- Removing the `confirm-override` logic from `DownloadDialog` if it lives there — only `DirectoryDialog` is in scope
- Persisting the chosen directory to `iac-toolbox.yml` — the directory is already used implicitly by subsequent steps
