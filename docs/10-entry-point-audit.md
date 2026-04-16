# Entry Point Audit: Running Individual Roles and Targeted Options

## Goal

Audit how this repository exposes targeted deployments so it is clear which components can be run individually, which options are missing, and where the documentation no longer matches the live Ansible playbook.

## Scope

This audit covers the current user-facing execution surfaces:

- `scripts/install.sh`
- `ansible-configurations/playbooks/main.yml`
- `README.md`
- `ansible-configurations/README.md`
- role directories under `ansible-configurations/playbooks/roles/`

It does **not** change implementation yet. This is a review document for aligning the CLI, tags, and docs before follow-up code changes.

## Current execution surfaces

### 1. Top-level script flags in `scripts/install.sh`

The install script currently exposes these modes/options:

- `--ansible-only`
- `--terraform-only`
- `--assistant`
- `--vault`
- `--cloudflared`
- `--local`

Behavior notes:

- `--assistant` maps to Ansible tag `assistant`
- `--vault` maps to Ansible tag `vault`
- `--cloudflared` maps to Ansible tag `cloudflare`
- there is no generic `--tags` passthrough
- there are no dedicated flags for `docker`, `loki`, `grafana`, `prometheus`, `github-runner`, `setup`, `tunnel`, or `secrets`

### 2. Active roles and tags in `playbooks/main.yml`

The main playbook currently includes these active roles:

| Role | Active in playbook | Tags |
| --- | --- | --- |
| `setup` | yes | `setup`, `base` |
| `docker` | yes | `docker` |
| `vault` | yes | `vault`, `secrets` |
| `loki` | yes | `loki`, `logs`, `monitoring` |
| `cloudflare-tunnel` | yes | `cloudflare`, `tunnel` |
| `cloudflare-tunnel-api` | yes | `cloudflare`, `tunnel` |

The repo also contains role directories that are **present but currently commented out** in `main.yml`:

| Role directory exists | Active in playbook | Notes |
| --- | --- | --- |
| `grafana` | no | role exists, playbook entry commented out |
| `prometheus` | no | role exists, playbook entry commented out |
| `openclaw` | no | role exists, playbook entry commented out |
| `promote_to_github_runner` | no | role exists, playbook entry commented out |

### 3. README usage examples

`README.md` currently advertises:

- `./scripts/install.sh --vault`
- `./scripts/install.sh --assistant`
- `./scripts/install.sh --ansible-only`
- `./scripts/install.sh --terraform-only`
- direct Ansible tags for:
  - `docker`
  - `vault`
  - `github-runner`
  - `cloudflare`

## Findings

### A. The repo has more roles than the top-level script exposes

The script exposes only a small subset of targeted component runs.

Missing first-class script coverage for currently active roles/tags:

- `docker`
- `loki`
- `setup`
- `secrets`
- `tunnel` (alias to current Cloudflare tunnel tags)

Missing script coverage for role directories that exist but are disabled in the main playbook:

- `grafana`
- `prometheus`
- `github-runner`

This means the current top-level UX is uneven:

- some components are selectable by flag
- some are only reachable by raw `ansible-playbook --tags ...`
- some are documented as reachable, but are not actually active in the playbook

### B. Documentation and playbook are out of sync

There are two direct mismatches:

1. `README.md` documents `--assistant`, but the `openclaw` role is commented out in `main.yml`
2. `README.md` documents `ansible-playbook ... --tags github-runner`, but the `promote_to_github_runner` role is commented out in `main.yml`

That creates a bad review surface because a reader cannot tell whether:

- the feature is intentionally disabled
- the docs are stale
- the role is unfinished
- the entry point was forgotten during refactor

### C. Naming is inconsistent across layers

Current examples:

- script flag: `--cloudflared`
- Ansible tags: `cloudflare`, `tunnel`
- role names: `cloudflare-tunnel`, `cloudflare-tunnel-api`

This is workable, but not clean. A person reading the repo has to translate between:

- service binary name (`cloudflared`)
- product name (`cloudflare`)
- function (`tunnel`)
- implementation-specific role name (`cloudflare-tunnel-api`)

The same repo should ideally have one canonical user-facing component name and a predictable alias strategy.

### D. The legacy Ansible README is stale enough to be misleading

`ansible-configurations/README.md` still describes an older cookbook flow:

- older OS assumptions
- old script entry points
- manual `ansible-vault create secrets.yml`
- setup guidance that does not reflect the current top-level install flow

For this audit topic, that matters because it gives yet another execution model, increasing ambiguity around the “correct” way to run an individual component.

### E. There is no canonical matrix of what is supported

The repo lacks a single table that answers these practical questions:

- Is this component implemented?
- Is it active in `main.yml`?
- Can I run it by Ansible tag?
- Can I run it from `scripts/install.sh`?
- Is it documented in the main README?
- Is it expected to work locally with `--local`?

Without that matrix, the answer currently depends on reading multiple files and spotting commented-out blocks.

## Current support matrix

| Component | Role dir exists | Active in `main.yml` | Ansible tag path | `install.sh` flag | README mentions it | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| setup/base | yes | yes | yes (`setup`, `base`) | no | no | foundational role but not exposed directly |
| docker | yes | yes | yes (`docker`) | no | yes | active but no first-class script flag |
| vault | yes | yes | yes (`vault`, `secrets`) | yes (`--vault`) | yes | most aligned path currently |
| secrets-only | tied to vault role | yes | yes (`secrets`) | no | partial | tag exists but no explicit script flag |
| loki | yes | yes | yes (`loki`, `logs`, `monitoring`) | no | no | active but largely undiscoverable |
| cloudflare tunnel | yes | yes | yes (`cloudflare`, `tunnel`) | yes (`--cloudflared`) | yes | naming mismatch across layers |
| grafana | yes | no | not active now | no | indirect | role exists but playbook entry disabled |
| prometheus | yes | no | not active now | no | indirect | role exists but playbook entry disabled |
| openclaw / assistant | yes | no | not active now | yes (`--assistant`) | yes | documented path does not currently map to a live role |
| github runner | yes | no | not active now | no | yes (`github-runner`) | documented tag path does not currently work from the main playbook |

## Review questions to answer before implementation

1. Which components are intentionally supported today?
   - only active roles in `main.yml`
   - or also dormant role directories that should be restored?

2. What should be the canonical user-facing selection model?
   - dedicated flags per component, e.g. `--docker`, `--loki`, `--vault`
   - generic `--tags docker,loki`
   - both, with dedicated flags as convenience wrappers

3. Should disabled roles be restored or removed from docs?
   - `openclaw`
   - `github-runner`
   - possibly `grafana` and `prometheus`

4. What naming should users see?
   - `--cloudflared`
   - `--cloudflare`
   - `--tunnel`
   - one canonical flag plus optional aliases is preferable

5. Should `install.sh` support multiple component selections in one run?
   - e.g. `--docker --loki`
   - or a generic `--tags docker,loki`

6. Should `--local` be documented as supported for all active Ansible-only component runs, or only for the subset that has been self-tested?

## Recommended alignment plan

### Phase 1: clarify supported surface in docs

Create one canonical component matrix in `README.md` covering:

- component name
- current status (active / disabled)
- playbook tags
- top-level script support
- local support notes

Also explicitly mark disabled-but-present roles so readers do not assume they are ready.

### Phase 2: normalize top-level selection UX

Recommended minimum change:

- add a generic `--tags <tag1,tag2>` option to `scripts/install.sh`
- keep convenience flags for the most common flows:
  - `--vault`
  - `--cloudflare` or `--tunnel`
  - optional aliases for backwards compatibility

Recommended optional convenience additions for active roles:

- `--docker`
- `--loki`
- `--setup`
- `--secrets`

This gives both:

- discoverable common commands
- a future-proof escape hatch without adding endless one-off flags

### Phase 3: resolve currently broken advertised paths

Choose one of the following per component:

- restore the role in `main.yml`
- remove the documented path from `README.md`
- mark it as planned / temporarily disabled

The most urgent mismatches are:

- `--assistant`
- `github-runner`

### Phase 4: retire or rewrite stale Ansible sub-README

`ansible-configurations/README.md` should either:

- be rewritten to match the current repo workflow, or
- be reduced to implementation notes and linked from the main README

Right now it reads like a parallel universe.

## Proposed definition of done for follow-up implementation

A follow-up change should be considered done when:

1. every active component in `main.yml` is either:
   - exposed by `install.sh`, or
   - explicitly documented as “run via raw Ansible tags”
2. no README example points to a disabled playbook path
3. naming is consistent enough that users can predict the tag/flag mapping
4. `--help` documents the supported targeted execution model clearly
5. at least one example shows multi-component or generic-tag execution if supported

## Suggested follow-up PR scope

A practical follow-up PR could include:

- `scripts/install.sh`
  - add generic `--tags`
  - add or normalize convenience aliases
  - validate incompatible flag combinations
- `README.md`
  - replace stale examples with a component matrix
  - document active vs disabled components
  - document local-targeted examples
- `ansible-configurations/README.md`
  - rewrite or deprecate
- optionally `playbooks/main.yml`
  - re-enable selected dormant roles if they are meant to be supported now

## Summary

The main problem is not that the repo cannot run individual pieces at all.

The main problem is that the repository currently exposes **three different truths**:

- what the script allows
- what the playbook actually runs
- what the README claims

Those truths need to be aligned before adding more knobs, otherwise the new knobs will just become better-documented confusion.
