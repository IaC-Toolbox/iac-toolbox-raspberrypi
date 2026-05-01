---
status: completed
completed_date: 2026-04-24
pr_url: https://github.com/IaC-Toolbox/iac-toolbox-cli/pull/137
---

# Bug: GitHub Build Workflow Docker image name defaults to hardcoded `my-repo`

## Summary

The Docker image name prompt in the GitHub Build Workflow dialog always defaults to `<username>/my-repo` regardless of the project. It should default to `<username>/<basename of cwd>`, since the directory name matches the GitHub repo name in the standard case.

## Repo

iac-toolbox-cli

## Observed behaviour

When the user selects the GitHub Build Workflow integration, the Docker image name prompt shows:

```
◇ Select integrations to install
│ GitHub Build Workflow
│
◆ Docker image name
   (Default: vvasylkovskyi1/my-repo — press Enter to use default)

   ›
```

The default repo segment is always the literal string `my-repo`.

## Expected behaviour

The default should use the basename of the current working directory (i.e., the directory where `iac-toolbox` is run), which is typically the same as the GitHub repository name:

```
◆ Docker image name
   (Default: vvasylkovskyi1/iac-toolbox-cli — press Enter to use default)
```

## Relevant files

- `src/components/GitHubBuildWorkflowDialog.tsx` — contains the bug at line 130
- `src/app.tsx` — renders the dialog; holds the `directory` state already computed by `DirectoryDialog`

## Context

`GitHubBuildWorkflowDialog` is a multi-step form that collects Docker Hub username, token, and image name. On the `imageName` step it computes a default on line 130:

```ts
const defaultImageName = `${username}/my-repo`;
```

The string `my-repo` is hardcoded. The component does not currently receive the working directory or any repo-name information as a prop. The parent `app.tsx` already holds a `directory` state variable (the resolved infrastructure directory, e.g. `/home/user/iac-toolbox-cli/infrastructure`) that is set before `GitHubBuildWorkflowDialog` is rendered.

## Likely cause

The placeholder `my-repo` was never replaced with a dynamic value. The fix requires computing `path.basename(process.cwd())` (or deriving it from the `directory` prop already available in the parent) and substituting it for the hardcoded string.

## Acceptance criteria

- [ ] Running `iac-toolbox` and selecting the GitHub Build Workflow integration shows a Docker image name default of `<dockerhub-username>/<basename of cwd>` instead of `<username>/my-repo`
- [ ] Pressing Enter without typing accepts the dynamic default (not `my-repo`)
- [ ] Typing a custom name still works — the entered value is used as-is
- [ ] `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:ci && pnpm build` all exit 0

## Validation

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test:ci
pnpm build
```

Then manually run `iac-toolbox` from a directory whose name is not `my-repo`, select GitHub Build Workflow, and verify the Docker image name default reflects the actual directory name.
