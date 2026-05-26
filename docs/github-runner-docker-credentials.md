# GitHub Runner Docker Credentials — Disable macOS Keychain

## What

Configure Docker to use a plain-file credential store instead of
`docker-credential-osxkeychain` on the macOS self-hosted runner.

## Why

launchd services run in a non-interactive security context. When `docker login`
(invoked by `docker/login-action`) calls `docker-credential-osxkeychain` to
save credentials, macOS returns:

```
Error saving credentials: error storing credentials - err: exit status 1,
out: `User interaction is not allowed.`
```

This happens because the Keychain cannot present a UI prompt to a background
process. Setting `"credsStore": ""` in `~/.docker/config.json` tells Docker to
store credentials as base64 in the config file directly, bypassing the Keychain.

## How

A Python3 task in `macos.yml` reads the existing `~/.docker/config.json` (or
starts from an empty object), sets `credsStore` to an empty string, and writes
the file back. Python3 is used for safe JSON round-trip — no risk of corrupting
existing keys (auth tokens, proxy config, etc.).

## Security note

Credentials stored this way are base64-encoded (not encrypted) in
`~/.docker/config.json`. This is acceptable for a developer machine acting as a
local self-hosted runner. Do not use this approach on shared or multi-user hosts.

## Files affected

- `ansible-configurations/playbooks/roles/promote_to_github_runner/tasks/macos.yml`
