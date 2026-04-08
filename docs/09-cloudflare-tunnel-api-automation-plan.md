# Cloudflare Tunnel API Automation Plan

## Overview

The current `cloudflare-tunnel` Ansible role depends on a manual browser login flow:

```bash
cloudflared tunnel login
```

That creates `~/.cloudflared/cert.pem`, and the role refuses to continue without it.

This works, but it makes the deployment only partially automated and awkward to reproduce on a fresh Raspberry Pi. It also blocks self-service bootstrap from Ansible alone.

The goal of this plan is to support **two user-selectable installation methods** for Cloudflare Tunnel:

1. **OAuth / browser login** — the current method
2. **API token / remotely managed tunnel** — the new automated method

This should be implemented without deleting the current role yet. The existing `cloudflare-tunnel` role should remain available during review and migration.

## Current Role Problems

Current role behavior:
- downloads the `cloudflared` binary
- requires `~/.cloudflared/cert.pem`
- uses `cloudflared tunnel create <name>` locally
- uses `cloudflared tunnel route dns ...` locally
- writes a local `config.yml`
- runs `cloudflared` as a systemd service

Weak points:
- not fully automatable on a fresh machine
- requires an interactive browser login
- couples infrastructure state to a locally generated cert file
- harder to re-run cleanly on another Pi or after reprovisioning
- CLI-driven state management is less explicit than API-managed state

## Can this be automated?

Yes.

Cloudflare documents an API flow for remotely managed tunnels. That flow can:
- create the tunnel via API
- return a tunnel `id`
- return a tunnel `token`
- configure ingress rules via API
- create DNS records via API
- run `cloudflared` using the returned tunnel token

This removes the need for `cloudflared tunnel login` and `cert.pem` in the normal provisioning path.

## Proposed Direction

Support two user-selectable Cloudflare installation modes.

- Keep the current `cloudflare-tunnel` role for **OAuth / browser-login** flow
- Add a new role, for example `cloudflare-tunnel-api`, for **API token / remotely managed tunnel** flow
- Let the repo select between them via config, for example a mode flag such as:

```yaml
cloudflare:
  enabled: true
  mode: oauth # or: api
```

This keeps the migration reversible, preserves the current working path, and makes review safer.

## Mode Comparison

| Mode | How it authenticates | Pros | Cons | Best use case |
| --- | --- | --- | --- | --- |
| `oauth` | `cloudflared tunnel login` + local `cert.pem` | Matches current workflow, no API token needed, simple when done manually once | Requires browser login, harder to automate, tied to local cert state | Manual setup or small one-off deployments |
| `api` | Cloudflare API token + account/zone metadata | Fully automatable, reproducible on fresh machines, better for Ansible-first provisioning | Requires Cloudflare token and IDs, more initial setup | Repeatable infrastructure provisioning and unattended installs |

### New high-level flow for the new role

1. Install `cloudflared`
2. Use Cloudflare API to create or look up the tunnel
3. Use Cloudflare API to configure ingress
4. Use Cloudflare API to create/update DNS records
5. Run `cloudflared` using the tunnel token
6. Keep the role idempotent so re-runs reconcile state instead of failing

## Required Inputs / Secrets

Yes — implementing the API-based role will require Cloudflare credentials from your side.

Recommended inputs:

```yaml
cloudflare:
  enabled: true
  mode: api
  account_id: "..."
  zone_id: "..."
  tunnel_name: "main-backend-tunnel"
  domains:
    - hostname: api.iac-toolbox.com
      service: http://localhost:80
    - hostname: vault.iac-toolbox.com
      service: http://localhost:8200

cloudflare_api_token: "{{ lookup('env', 'CLOUDFLARE_API_TOKEN') }}"
```

Suggested split:
- non-secret values in `inventory/group_vars/all.yml`
- API token loaded from environment, following the repo’s existing pattern

Recommended environment variable names:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_ZONE_ID`

### What you would need to provide

1. **Cloudflare API token** via `CLOUDFLARE_API_TOKEN`
2. **Cloudflare Account ID** via `CLOUDFLARE_ACCOUNT_ID`
3. **Cloudflare Zone ID** via `CLOUDFLARE_ZONE_ID` for the domain hosting these DNS records

### Where to get them

#### 1. Cloudflare API token
In the Cloudflare dashboard:
- Go to **My Profile** → **API Tokens**
- Click **Create Token**
- Prefer a custom token with the minimum permissions needed

Likely permissions needed:
- **Account** → Cloudflare Tunnel / Cloudflare One connectors: **Edit**
- **Zone** → DNS: **Edit**

The token should be provided to Ansible via environment variables, not committed into git. The intended names are:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_ZONE_ID`

#### 2. Account ID
In the Cloudflare dashboard:
- Open the relevant account
- Look in the account overview/sidebar area for **Account ID**

#### 3. Zone ID
In the Cloudflare dashboard:
- Open the relevant zone/domain
- On the domain overview page, copy the **Zone ID**

## Required Cloudflare API Permissions

At minimum, the API token will likely need:
- **Account**: Cloudflare Tunnel / Cloudflare One connectors write permissions
- **Zone**: DNS edit permissions

Exact permission names should be documented in the implementation PR and mirrored in `.env.example` / docs.

## Role Changes to Make in the new role

### 1. Preserve OAuth mode, add token mode separately

The new role should not:
- check for `~/.cloudflared/cert.pem`
- require `cloudflared tunnel login`

The old role should remain available as the OAuth-based path.

Expected user-facing behavior in the future:
- `cloudflare.mode: oauth` → current browser-login / `cert.pem` based path
- `cloudflare.mode: api` → token/API based path

### 2. Replace CLI tunnel creation with API creation

Instead of:
- `cloudflared tunnel create <name>`

Use API to:
- create the tunnel if it does not exist
- fetch tunnel metadata if it already exists
- persist tunnel id/token for the service

### 3. Replace CLI DNS routing with API-managed DNS

Instead of:
- `cloudflared tunnel route dns ...`

Use the DNS API to create/update proxied CNAME records pointing hostnames to:

```text
<tunnel-id>.cfargotunnel.com
```

### 4. Manage ingress via API

Instead of relying only on local `config.yml`, push the ingress configuration through the tunnel configuration API.

That gives Cloudflare-side tunnel configuration and reduces reliance on local state.

### 5. Simplify service runtime

Prefer token-based runtime, for example:

```bash
cloudflared service install <TUNNEL_TOKEN>
```

or an equivalent systemd-managed command using the token directly.

This avoids needing `cert.pem` and keeps the runtime aligned with remote-managed tunnels.

## Idempotency Improvements

The implementation should explicitly handle:
- tunnel already exists
- DNS record already exists but points to the wrong target
- ingress config drift between repo and Cloudflare
- service already installed with an old token or old tunnel id

The role should converge to the desired state instead of failing on re-run.

## Migration Concerns

Because the OAuth role stays in place, we can avoid a hard cutover at first.

If a locally managed tunnel already exists, we need to decide whether to:
- migrate it in place if possible, or
- create a new API-managed tunnel and switch DNS/service over cleanly, or
- keep both roles available and let config select which one is active

The safest first implementation is usually:
- keep OAuth mode working as-is
- create the new API role separately
- validate API mode on the Raspberry Pi
- let users choose `oauth` or `api`
- only later decide whether one mode should become the default

## Suggested Implementation Phases

### Phase 1 — Documentation / design
- document both supported installation methods: `oauth` and `api`
- document required Cloudflare secrets and permissions for `api`
- define final variable schema
- decide migration strategy for existing tunnels
- define how the repo selects OAuth role vs API role

### Phase 2 — New API-managed role
- create a new role such as `cloudflare-tunnel-api`
- create/lookup tunnel via API
- store tunnel id/token safely

### Phase 3 — DNS + ingress reconciliation
- create/update DNS records via API
- manage ingress config via API

### Phase 4 — Runtime + validation
- run `cloudflared` with token-based runtime
- validate behavior on the Raspberry Pi
- document rollback path to the old role

### Phase 5 — Optional future cleanup
- only after validation and approval, decide whether the old role should eventually be retired

## Open Questions

1. Should the repo select OAuth vs API mode with a simple mode flag, or separate booleans?
2. Should the repo standardize on `CLOUDFLARE_API_TOKEN` as the env var name for the API mode?
3. Should the token be account-scoped for one account, or do we want a more reusable variable model for multiple zones/accounts later?
4. Do we want to preserve the current local `config.yml` as a fallback/debug artifact, or rely entirely on API-managed ingress?
5. If an old tunnel already exists under the same name, do we reuse it or replace it?
6. Do you want me to document a step-by-step UI path with exact field names for obtaining the Cloudflare token, account id, and zone id?

## Recommended Next Step

Approve this plan first.

Then implementation should happen in a dedicated PR that:
- adds the new variables and docs
- documents both supported modes: OAuth and API token
- creates a new `cloudflare-tunnel-api` role (or similarly named role)
- leaves the current `cloudflare-tunnel` role intact
- validates idempotent behavior on the Raspberry Pi
- documents exactly which Cloudflare token/account/zone values are required
- uses an environment-variable pattern for the API token, consistent with the repo’s other secret inputs
