---
feature: threshold-alerts-terraform-dest-step
status: draft
---

# Threshold Alerts — Terraform Destination Step

## What

Add a text-input step to `threshold-alerts-init-wizard.tsx` that asks the user
where Terraform alert files should be rendered. The entered path is written to
`iac-toolbox.yml` as the top-level key `threshold_alerts_terraform_dest`.

## Why

The Ansible role `threshold-alerts` resolves the Terraform output directory
from the variable `threshold_alerts_terraform_dest` (see
`roles/threshold-alerts/defaults/main.yml` line 5). Currently this variable
has no default that the user can supply via the wizard, so `install` will fail
unless the variable is already present in `iac-toolbox.yml` manually.

## How

### Step flow change

```
choose → (yes) → terraform-dest → done
       → (no)  ─────────────────→ done
```

### Files affected

| File | Change |
|------|--------|
| `cli/src/clis/threshold-alerts/threshold-alerts-config.ts` | Add `loadThresholdAlertsTerraformDest()` and `updateThresholdAlertsTerraformDest()` |
| `cli/src/clis/threshold-alerts/threshold-alerts-init-wizard.tsx` | Add `'terraform-dest'` step with `ink-text-input`; wire save + inject pattern |
| `cli/infrastructure/iac-toolbox.yml` | Written by the config function at runtime |

### iac-toolbox.yml key

`threshold_alerts_terraform_dest` is a **top-level** key (not nested under
`threshold_alerts`) because the Ansible role default template reads it as a
bare variable:

```yaml
threshold_alerts_terraform_dest: "{{ threshold_alerts_terraform_dest }}/terraform/grafana-alerts"
```

Example result in `iac-toolbox.yml`:

```yaml
threshold_alerts:
  enabled: true
threshold_alerts_terraform_dest: ./infrastructure
```

The Ansible role then resolves the full path as
`./infrastructure/terraform/grafana-alerts`.

### Default pre-fill value

`./infrastructure` — mirrors the conventional project layout already committed
in this repo (`cli/infrastructure/terraform/grafana-alerts`).

### Props added to wizard

```typescript
_TextInput?: (props: TextInputProps) => null;       // injectable for tests
_updateTerraformDest?: (dest: string, path: string) => void;  // injectable for tests
```

## Open questions / tradeoffs

- Step only shown when user selects "yes". No point asking for a dest if
  alerts are disabled — the variable is not used by Ansible in that case.
- Validation: reject empty string only; no path-existence check (paths can
  be relative and won't exist until `install` is run).
