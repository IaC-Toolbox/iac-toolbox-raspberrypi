# Fix: Ansible "Display completion message" fails with node_exporter.port undefined

## What

Fix the Ansible playbook post-task "Display completion message" that crashes with:

```
Error while resolving value for 'msg': object of type 'dict' has no attribute 'port'
```

when running `iac-toolbox metrics-agent install`.

## Why (the problem)

The playbook template at `infrastructure/ansible-configurations/playbooks/main.yml:126`
references `{{ node_exporter.port }}` inside a `{% if prometheus is defined and prometheus.enabled %}` block.

Root cause — Ansible variable precedence:

1. `iac-toolbox.yml` is loaded as `--extra-vars "@file"`, which has the **highest** precedence in Ansible.
2. `iac-toolbox.yml` defines `node_exporter: {enabled: true}` — no `port` key.
3. This **completely overrides** the `prometheus` role defaults that define `node_exporter.port: 9100`.
4. At render time the Jinja2 template enters the prometheus block (because `prometheus.enabled: true`), then tries to access `node_exporter.port` on a dict that only has `{enabled: true}` → error.

The same risk exists for `alloy.domain` (line 134) — `alloy` is never defined in
`iac-toolbox.yml` but is referenced inside the loki conditional block. If loki is ever
enabled without an `alloy` config, it would fail similarly.

## How (the approach)

Add `| default(...)` fallbacks in the playbook template for every variable reference that
can legitimately be absent from user-supplied extra-vars:

| Reference            | Default |
| -------------------- | ------- |
| `node_exporter.port` | `9100`  |
| `alloy.domain`       | `''`    |

This makes the completion message resilient to partial configs without changing any
business logic. Defaults match the role defaults so the displayed values are accurate
even when not overridden.

No change to `iac-toolbox.yml` — that file is user-owned and may be regenerated; the
playbook should never rely on it being complete.

## Files affected

- `cli/infrastructure/ansible-configurations/playbooks/main.yml` — add `| default()` to two template expressions (lines ~125–134)

## Tradeoffs

- A `| default('')` on `alloy.domain` means the Alloy line shows a blank URL if `alloy` is
  not defined, which is better than a crash. The `| default(9100)` for node_exporter port
  will always be accurate since 9100 is the only value ever used.
- Alternatively, `iac-toolbox.yml` could be updated to always include `node_exporter.port`,
  but that couples the fix to a user-owned file and doesn't protect other users whose
  configs were generated before this change.
