# Cloudflare Tunnel API Automation Plan

## Overview

The current `cloudflare-tunnel` Ansible role depends on a manual browser login flow:

```bash
cloudflared tunnel login
```

That creates `~/.cloudflared/cert.pem`, and the role refuses to continue without it.

This works, but it makes the deployment only partially automated and awkward to reproduce on a fresh Raspberry Pi. It also blocks self-service bootstrap from Ansible alone.

The goal of this plan is to add a Cloudflare API driven workflow **as a separate role**, without deleting the current role yet. The existing `cloudflare-tunnel` role should remain available during review and migration.

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

Add a **new role** for API-managed tunnels alongside the existing role.

- Keep the current `cloudflare-tunnel` role unchanged for now
- Add a new role, for example `cloudflare-tunnel-api`
- Let the repo switch between them via config once the new path is validated

This keeps the migration reversible and makes review safer.

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

cloudflare_api_token: "..."
```

Suggested split:
- non-secret values in `inventory/group_vars/all.yml`
- `cloudflare_api_token` in encrypted `secrets.yml` or another secret-backed input

### What you would need to provide

1. **Cloudflare API token**
2. **Cloudflare Account ID**
3. **Cloudflare Zone ID** for the domain hosting these DNS records

### Where to get them

#### 1. Cloudflare API token
In the Cloudflare dashboard:
- Go to **My Profile** → **API Tokens**
- Click **Create Token**
- Prefer a custom token with the minimum permissions needed

Likely permissions needed:
- **Account** → Cloudflare Tunnel / Cloudflare One connectors: **Edit**
- **Zone** → DNS: **Edit**

The token should be provided to Ansible as a secret, not committed into git.

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

### 1. Do not depend on manual cert login

The new role should not:
- check for `~/.cloudflared/cert.pem`
- require `cloudflared tunnel login`

The old role should remain untouched during the migration phase.

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

Because the old role stays in place, we can avoid a hard cutover at first.

If a locally managed tunnel already exists, we need to decide whether to:
- migrate it in place if possible, or
- create a new API-managed tunnel and switch DNS/service over cleanly, or
- keep both roles available and let config select which one is active

The safest first implementation is usually:
- create the new role separately
- validate it on the Raspberry Pi
- only later decide whether to retire the old role

## Suggested Implementation Phases

### Phase 1 — Documentation / design
- document required Cloudflare secrets and permissions
- define final variable schema
- decide migration strategy for existing tunnels
- define how the repo selects old role vs new role

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

1. Should the repo select old role vs new role with a simple mode flag, or separate booleans?
2. Where should the Cloudflare API token live in this repo’s final workflow?
3. Should the token be account-scoped for one account, or do we want a more reusable variable model for multiple zones/accounts later?
4. Do we want to preserve the current local `config.yml` as a fallback/debug artifact, or rely entirely on API-managed ingress?
5. If an old tunnel already exists under the same name, do we reuse it or replace it?
6. Do you want me to document a step-by-step UI path with exact field names for obtaining the Cloudflare token, account id, and zone id?

## Recommended Next Step

Approve this plan first.

Then implementation should happen in a dedicated PR that:
- adds the new variables and docs
- creates a new `cloudflare-tunnel-api` role (or similarly named role)
- leaves the current `cloudflare-tunnel` role intact
- validates idempotent behavior on the Raspberry Pi
- documents exactly which Cloudflare token/account/zone values are required
