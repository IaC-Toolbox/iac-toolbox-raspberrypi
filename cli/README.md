# iac-toolbox-cli

An Ink-based terminal CLI for Infrastructure as Code workflows.

## Features

- Interactive setup wizard for the Raspberry Pi flow
- Mocked step engine for approve, skip, and back navigation
- Visible progress and a final summary screen
- React-based terminal UI via [Ink](https://github.com/vadimdemedes/ink)

## Wizard Flow

The phase-1 CLI replaces the old hello-world app with a guided Ink wizard that walks through:

1. Welcome
2. Install Ansible
3. Install Terraform
4. Bootstrap repository notice for `IaC-Toolbox/iac-toolbox-raspberrypi`
5. Playbook overview
6. Individual playbook steps for:
   - `base/setup`
   - `docker`
   - `vault`
   - `cloudflare tunnel`
   - `grafana`
   - `prometheus`
   - `loki`
   - `openclaw`
   - `github runner`
7. Summary

The wizard is UI-only in this phase. It shows mocked running states and per-step status markers, but it does not execute real install commands, clone repositories, collect API keys, or write environment files.

## Controls

- `Enter` continues or approves the current step
- `s` skips the current step when skipping is available
- `b` returns to the previous step when going back is available
- `q` quits the wizard

## Getting Started

```bash
pnpm install
pnpm dev
```

The current wizard phase is UI only. It does not execute real install commands.

## Scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm typecheck
pnpm lint
pnpm lint:fix
pnpm format
pnpm format:check
```

- `pnpm dev` runs the CLI directly from TypeScript via `tsx`
- `pnpm build` compiles the CLI into `dist/`
- `pnpm start` runs the compiled CLI from `dist/cli.js`
- `pnpm typecheck` runs TypeScript without emitting files
- `pnpm lint` and `pnpm lint:fix` run ESLint
- `pnpm format` and `pnpm format:check` run Prettier

## Stack

- [Ink](https://github.com/vadimdemedes/ink) — React renderer for CLIs
- [React](https://react.dev) — Component model
- TypeScript
- ESLint + Prettier
- Node.js ESM modules
