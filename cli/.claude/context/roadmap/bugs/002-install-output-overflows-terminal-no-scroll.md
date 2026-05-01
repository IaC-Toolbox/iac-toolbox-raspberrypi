---
status: draft
completed_date:
pr_url:
---

# Bug: Install output overflows terminal with no scrolling

## Summary

`InstallRunnerDialog` appends every stdout/stderr line from `install.sh` into an unbounded React state array and renders all of them as `<Text>` nodes. Once the number of lines exceeds the terminal height the output overflows and earlier lines are pushed off screen with no way to scroll back, making the running install effectively unreadable.

## Repo

iac-toolbox-cli

## Observed behaviour

- As `install.sh` runs, lines are pushed into `outputLines` state and rendered one `<Text>` per line inside a `<Box flexDirection="column">`
- When the total rendered height exceeds the terminal window height, Ink clips the top of the output — earlier lines scroll off and are permanently inaccessible
- The user can only see the most-recently rendered lines; there is no scroll affordance

## Expected behaviour

- The output region should be height-constrained to the available terminal space and scrollable, so the user can review all captured output without losing earlier lines
- The scroll view should auto-follow the latest line while the install is running (tail mode), and allow the user to scroll up/down freely once the install finishes
- The rest of the dialog chrome (header, spinner, error banner) should remain visible outside the scroll region

## Relevant files

- `src/components/InstallRunnerDialog.tsx` — renders all `outputLines` as a flat list with no height constraint or scroll wrapper
- `package.json` — does not yet include `ink-scroll-view`

## Context

PR #132 introduced live line capture: `outputLines` state grows by one entry per line emitted by `install.sh`, and each entry is rendered as `<Text key={i} dimColor>│ {line}</Text>` inside the top-level `<Box flexDirection="column">`. There is no `height` prop, no `overflow` setting, and no scroll component wrapping the list. Ink renders the full Box tree each frame; once it exceeds the terminal rows the component overflows. `ink-scroll-view@0.3.6` is published on npm with peer deps `ink ^5 || ^6` and `react ^18 || ^19`, matching the project's current dependencies exactly.

## Likely cause

The `outputLines` list is unbounded and rendered in a plain `<Box>` with no height limit or scroll wrapper. Wrapping it with `<ScrollView>` from `ink-scroll-view` and giving it a fixed height (e.g. `process.stdout.rows - 6` to leave room for the dialog chrome) would constrain the render height and enable scrolling.

## Acceptance criteria

- [ ] `ink-scroll-view` is added as a production dependency in `package.json`
- [ ] The output lines in `InstallRunnerDialog` are rendered inside a `<ScrollView>` (or equivalent scroll container from `ink-scroll-view`) with a height derived from the available terminal rows
- [ ] While the install is running, the scroll view auto-follows (tails) the latest line so the user always sees fresh output without manual interaction
- [ ] After the install finishes (success or failure), the user can scroll up and down through all captured output using arrow keys or j/k
- [ ] The header ("◆ Running install..."), spinner, and failure error banner remain outside the scroll region and are always visible
- [ ] The component still calls `onComplete` immediately on success and waits for a key press on failure (existing behaviour unchanged)
- [ ] `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test:ci`, and `pnpm build` all pass

## Validation

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test:ci
pnpm build
```
