# Refactor: Co-locate feature files under cli/src/clis/

## What

Create `cli/src/clis/<feature>/` folders. Each folder owns its entry-point, action(s), feature-specific component(s), and feature-specific config util. The flat `actions/`, `entry-points/`, and `commands/` directories are removed.

Files are renamed to kebab-case as part of the move (applying the File Naming convention).

## Why

`components/`, `actions/`, and `entry-points/` are flat buckets — to understand what belongs to "grafana" you have to hunt across four directories. Co-location makes each feature self-contained and easy to navigate, add to, or delete.

## How

### New structure

```
cli/src/
├── clis/
│   ├── apply/
│   │   ├── apply-command.ts       ← commands/applyCommand.ts
│   │   ├── apply-install.ts       ← actions/applyInstall.ts
│   │   ├── apply-install.test.ts  ← actions/applyInstall.test.ts
│   │   └── apply-summary.ts       ← utils/applySummary.ts
│   ├── cadvisor/
│   │   └── cadvisor-install.ts    ← actions/cadvisorInstall.ts
│   ├── cloudflare/
│   │   ├── cloudflare.tsx                  ← entry-points/cloudflare.tsx
│   │   ├── cloudflare-install.ts           ← actions/cloudflareInstall.ts
│   │   ├── cloudflare-config.ts            ← utils/cloudflareConfig.ts
│   │   ├── cloudflare-config.test.ts       ← utils/cloudflareConfig.test.ts
│   │   ├── cloudflare-config-dialog.tsx    ← components/CloudflareConfigDialog.tsx
│   │   ├── cloudflare-config-dialog.test.tsx
│   │   ├── cloudflare-init-wizard.tsx      ← components/CloudflareInitWizard.tsx
│   │   └── cloudflare-init-wizard.test.tsx
│   ├── credentials/
│   │   ├── credentials.tsx                 ← entry-points/credentials.tsx
│   │   ├── credentials.ts                  ← utils/credentials.ts
│   │   ├── credentials.test.ts
│   │   ├── credential-validators.ts        ← utils/credentialValidators.ts
│   │   ├── credential-validators.test.ts
│   │   ├── credential-set-dialog.tsx       ← components/CredentialSetDialog.tsx
│   │   ├── credential-prompt.tsx           ← components/CredentialPrompt.tsx
│   │   └── credential-prompt.test.tsx
│   ├── github-build-workflow/
│   │   ├── github-build-workflow.ts                ← entry-points/github-build-workflow.ts
│   │   └── github-build-workflow-dialog.tsx        ← components/GitHubBuildWorkflowDialog.tsx
│   ├── github-runner/
│   │   ├── github-runner.ts                        ← entry-points/github-runner.ts
│   │   └── github-actions-config-dialog.tsx        ← components/GitHubActionsConfigDialog.tsx
│   ├── grafana/
│   │   ├── grafana.tsx                     ← entry-points/grafana.tsx
│   │   ├── grafana-install.ts              ← actions/grafanaInstall.ts
│   │   ├── grafana-config.ts               ← utils/grafanaConfig.ts
│   │   ├── grafana-config.test.ts
│   │   ├── grafana-config-dialog.tsx       ← components/GrafanaConfigDialog.tsx
│   │   ├── grafana-config-dialog.test.tsx
│   │   ├── grafana-init-wizard.tsx         ← components/GrafanaInitWizard.tsx
│   │   └── grafana-init-wizard.test.tsx
│   ├── init/
│   │   ├── init.tsx                        ← entry-points/init.tsx
│   │   ├── init-wizard.tsx                 ← components/InitWizard.tsx
│   │   └── init-wizard.test.tsx
│   ├── install/
│   │   ├── install.ts                      ← entry-points/install.ts
│   │   ├── file-path-install.ts            ← actions/filePathInstall.ts
│   │   └── standalone-install.ts           ← utils/standaloneInstall.ts
│   ├── loki/
│   │   └── loki.ts                         ← entry-points/loki.ts
│   ├── metrics-agent/
│   │   ├── metrics-agent.tsx               ← entry-points/metrics-agent.tsx
│   │   ├── metrics-agent-install.ts        ← actions/metricsAgentInstall.ts
│   │   ├── metrics-agent-config.ts         ← utils/metricsAgentConfig.ts
│   │   ├── metrics-agent-config.test.ts
│   │   ├── metrics-agent-init-wizard.tsx   ← components/MetricsAgentInitWizard.tsx
│   │   └── metrics-agent-init-wizard.test.tsx
│   ├── prometheus/
│   │   ├── prometheus.tsx                  ← entry-points/prometheus.tsx
│   │   ├── prometheus-install.ts           ← actions/prometheusInstall.ts
│   │   ├── prometheus-config.ts            ← utils/prometheusConfig.ts
│   │   ├── prometheus-config.test.ts
│   │   ├── prometheus-config-dialog.tsx    ← components/PrometheusConfigDialog.tsx
│   │   ├── prometheus-init-wizard.tsx      ← components/PrometheusInitWizard.tsx
│   │   └── prometheus-init-wizard.test.tsx
│   ├── target/
│   │   ├── target.tsx                      ← entry-points/target.tsx
│   │   ├── target-config.ts                ← utils/targetConfig.ts
│   │   ├── target-config.test.ts
│   │   ├── target-init-wizard.tsx          ← components/TargetInitWizard.tsx
│   │   └── target-init-wizard.test.tsx
│   ├── uninstall/
│   │   └── uninstall.ts                    ← entry-points/uninstall.ts
│   └── vault/
│       ├── vault.ts                        ← entry-points/vault.ts
│       ├── vault-config-dialog.tsx         ← components/VaultConfigDialog.tsx
│       └── vault-config-dialog.test.tsx
│
├── components/          # shared cross-feature UI (unchanged names for now)
│   ├── BecomePasswordDialog.tsx
│   ├── ConfigSummaryDialog.tsx
│   ├── ConnectionDialog.tsx
│   ├── DeviceProfileDialog.tsx
│   ├── DeviceTypeDialog.tsx
│   ├── DirectoryDialog.tsx
│   ├── DockerConfigDialog.tsx
│   ├── DownloadDialog.tsx
│   ├── InstallCompleteDialog.tsx
│   ├── InstallPromptDialog.tsx
│   ├── InstallRunnerDialog.tsx
│   ├── IntegrationSelectDialog.tsx
│   ├── ManualRunDialog.tsx
│   ├── ObservabilityRemoteDialog.tsx
│   ├── PagerDutyConfigDialog.tsx    # no CLI entry-point yet → stays shared
│   ├── PrerequisiteInstaller.tsx
│   ├── PrerequisitePrompt.tsx
│   ├── SelectDialog.tsx
│   └── WizardSummaryDialog.tsx
│
├── utils/               # shared cross-feature utilities (unchanged)
│   ├── ansibleRunner.ts
│   ├── configGenerator.ts
│   ├── configResolver.ts
│   ├── downloadFiles.ts
│   ├── envParser.ts
│   ├── healthCheck.ts
│   ├── iacToolboxConfig.ts
│   ├── installRunner.ts
│   ├── preflightChecks.ts
│   ├── prerequisites.ts
│   └── print.ts
│
├── design-system/       # unchanged
├── hooks/               # unchanged
├── validators/          # unchanged
├── types/               # unchanged
├── app.tsx              # unchanged (legacy wizard)
└── cli.tsx              # import paths updated
```

### Directories deleted after move
- `cli/src/actions/` (all contents moved)
- `cli/src/entry-points/` (all contents moved)
- `cli/src/commands/` (all contents moved)

### Import path updates required
Every file that imports from the moved paths needs updating. Key consumers:
- `cli.tsx` — all entry-point imports
- `utils/iacToolboxConfig.ts` — imports GrafanaConfigDialog, VaultConfigDialog, GitHubBuildWorkflowDialog, ObservabilityRemoteDialog... wait — these stay in shared `components/`? No — GrafanaConfigDialog moves to clis/grafana/, but iacToolboxConfig.ts can still import from `../clis/grafana/grafana-config-dialog.js`
- `app.tsx` — imports many components from old paths
- Test files import from their own directory

## Files affected

~55 files move (renamed to kebab-case). All their consumers' import paths update. No logic changes.

## Tradeoffs

- **Pro:** Each feature is fully self-contained — one folder to open, one folder to delete
- **Pro:** Forces kebab-case rename for all moved files, applying the new convention
- **Con:** Large diff (~55 file moves + path updates in all consumers). CI must pass before merge
- `PagerDutyConfigDialog` stays in `components/` for now since there is no pagerduty CLI feature yet
- Shared generic dialogs (SelectDialog, BecomePasswordDialog etc.) remain in `components/` since they have no single feature owner
