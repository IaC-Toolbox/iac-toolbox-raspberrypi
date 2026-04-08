# Cloudflare Tunnel API Automation Plan

## Overview

The current `cloudflare-tunnel` Ansible role depends on a manual browser login flow:

```bash
cloudflared tunnel login
```

That creates `~/.cloudflared/cert.pem`, and the role refuses to continue without it.

This works, but it makes the deployment only partially automated and awkward to reproduce on a fresh Raspberry Pi. It also blocks self-service bootstrap from Ansible alone.

The goal of this plan is to replace the manual `cert.pem` / browser-login dependency with a Cloudflare API driven workflow.

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

Move the role from **locally managed tunnel + cert.pem** to **remotely managed tunnel + API token**.

### New high-level flow

1. Install `cloudflared`
2. Use Cloudflare API to create or look up the tunnel
3. Use Cloudflare API to configure ingress
4. Use Cloudflare API to create/update DNS records
5. Run `cloudflared` using the tunnel token
6. Keep the role idempotent so re-runs reconcile state instead of failing

## Proposed Inputs

Add required Cloudflare variables, likely sourced from encrypted secrets or environment variables:

```yaml
cloudflare:
  enabled: true
  account_id: "..."
  zone_id: "..."
  api_token: "..."
  tunnel_name: "main-backend-tunnel"
  domains:
    - hostname: api.iac-toolbox.com
      service: http://localhost:80
    - hostname: vault.iac-toolbox.com
      service: http://localhost:8200
```

Possible split:
- non-secret values in `inventory/group_vars/all.yml`
- secret token in `secrets.yml` or environment-backed secret generation

## Required Cloudflare API Permissions

At minimum, the API token will likely need:
- **Account**: Cloudflare Tunnel / Cloudflare One connectors write permissions
- **Zone**: DNS edit permissions

Exact permission names should be documented in the implementation PR and mirrored in `.env.example` / docs.

## Role Changes to Make

### 1. Remove manual cert dependency

Current behavior to remove:
- checking for `~/.cloudflared/cert.pem`
- failing with instructions to run `cloudflared tunnel login`

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

If a locally managed tunnel already exists, we need to decide whether to:
- migrate it in place if possible, or
- create a new API-managed tunnel and switch DNS/service over cleanly

This should be decided before implementation, because it affects production cutover and credential handling.

## Suggested Implementation Phases

### Phase 1 — Documentation / design
- document required Cloudflare secrets and permissions
- define final variable schema
- decide migration strategy for existing tunnels

### Phase 2 — API-managed tunnel creation
- create/lookup tunnel via API
- store tunnel id/token safely

### Phase 3 — DNS + ingress reconciliation
- create/update DNS records via API
- manage ingress config via API

### Phase 4 — Runtime + migration cleanup
- update systemd/service execution to use token-based runtime
- remove cert.pem/browser-login logic
- document rollback path

## Open Questions

1. Should the role support both local-login mode and API mode during migration, or should it switch fully to API-managed tunnels?
2. Where should the Cloudflare API token live in this repo’s final workflow?
3. Should the token be account-scoped for one account, or do we want a more reusable variable model for multiple zones/accounts later?
4. Do we want to preserve the current local `config.yml` as a fallback/debug artifact, or rely entirely on API-managed ingress?
5. If an old tunnel already exists under the same name, do we reuse it or replace it?

## Recommended Next Step

Approve this plan first.

Then implementation should happen in a dedicated PR that:
- adds the new variables and docs
- updates the `cloudflare-tunnel` role to API automation
- validates idempotent behavior on the Raspberry Pi
- removes the browser-login dependency from the normal path
