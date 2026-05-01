# Tasks: iac-toolbox CLI — Terminal Design System Overview

Source: 07-terminal-design-system-overview.md
Repo: /Users/vvasylkovskyi/git/iac-toolbox-cli
Branch: feat/terminal-design-system-overview
Base branch: main
Worktree: /Users/vvasylkovskyi/git/iac-toolbox-cli/.claude/worktrees/session
Status: pending

## Tasks

- [ ] 1. Create `src/design-system/tokens.ts` — Colors, Symbols, Spacing constants as defined in spec
- [ ] 2. Create `src/design-system/components/Frame.tsx` — outer wizard border/header component
- [ ] 3. Create `src/design-system/components/Step.tsx` — wizard step container with active/completed/pending states
- [ ] 4. Create `src/design-system/components/TextInput.tsx` — ink-text-input wrapper with label and pipe decoration
- [ ] 5. Create `src/design-system/components/PasswordInput.tsx` — TextInput with masking
- [ ] 6. Create `src/design-system/components/SelectInput.tsx` — ink-select-input wrapper
- [ ] 7. Create `src/design-system/components/MultiSelect.tsx` — multi-toggle checkbox list
- [ ] 8. Create `src/design-system/components/Spinner.tsx` — ink-spinner wrapper with label
- [ ] 9. Create `src/design-system/components/StatusLine.tsx` — status indicators (● ○ ✔ ✗)
- [ ] 10. Create `src/design-system/components/Badge.tsx` — inline tag for coming-soon/disabled states
- [ ] 11. Create `src/design-system/components/Divider.tsx` — pipe separator line
- [ ] 12. Create `src/design-system/components/Alert.tsx` — warning block with ⚠ styling
- [ ] 13. Create `src/design-system/components/Summary.tsx` — final confirmation screen layout
- [ ] 14. Create `src/design-system/index.ts` — re-exports all components and tokens
- [ ] 15. Run `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:ci && pnpm build` — all must exit 0
