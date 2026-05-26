# GitHub Runner macOS Environment PATH Fix

## What

After installing the GitHub Actions runner as a launchd service on macOS, write a
`.env` file into the runner directory that sets `PATH` to the user's full
login-shell PATH. The Actions runner reads this file at startup and injects its
contents into every job's environment.

## Why

launchd services start with a minimal `PATH`:
`/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin`

`/opt/homebrew/bin` is absent, so `docker` (and any other Homebrew-managed
binary) is not found when GitHub Actions resolves it via `which`. This causes
`docker/login-action` and any `docker` CLI calls in workflow steps to fail with:

```
Error: Unable to locate executable file: docker. Please verify either the file
path exists or the file can be found within a directory specified by the PATH
environment variable.
```

## How

In `roles/promote_to_github_runner/tasks/macos.yml`, add one new task after the
runner is extracted. The task runs unconditionally (no `when:` guard) so
re-running the playbook keeps `.env` in sync if the user's PATH changes.

It reuses the `iac_shell_profile` and `iac_shell_executable` facts set by
`common.yml` pre_tasks, which are always available because `github-runner.yml`
imports `common.yml`.

A handler restarts the runner service whenever `.env` is rewritten so the new
PATH is picked up immediately.

## Files affected

- `ansible-configurations/playbooks/roles/promote_to_github_runner/tasks/macos.yml`
- `ansible-configurations/playbooks/roles/promote_to_github_runner/handlers/main.yml` (new)
