---
status: in-progress
completed_date:
pr_url:
---

# Unit Test Coverage — Complete placeholder tests and add missing coverage

## Overview

Multiple test files contain only placeholder `expect(true).toBe(true)` tests, resulting in 0% coverage for critical utils like `ansibleRunner.ts`, `envParser.ts`, `iacToolboxConfig.ts`, `downloadFiles.ts`, and `standaloneInstall.ts`. This feature completes all placeholder tests with real test cases, adds missing test files for untested modules, and targets 80%+ coverage for critical paths (credential handling, config generation, install orchestration) to ensure safety for future development.

---

## What Changes

| Area                                     | Change                                                                                                                                       |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/utils/ansibleRunner.test.ts`        | Replace placeholder — add tests for `buildInstallEnv`, `resolveInstallScript`, `installScriptExists`, `runInstallScript` with mocked `spawn` |
| `src/utils/envParser.test.ts`            | Replace placeholder — add tests for parsing `.env` format if that's what this module does                                                    |
| `src/utils/iacToolboxConfig.test.ts`     | Replace placeholder — add tests for loading/saving `iac-toolbox.yml`                                                                         |
| `src/utils/downloadFiles.test.ts`        | New file — add tests for `downloadFile`, `fetchGitHubDirectory`, `downloadGitHubDirectory` with mocked `https`                               |
| `src/utils/standaloneInstall.test.ts`    | New file — add tests for `runStandaloneInstall`, `configFileExists`, `checkPasswordlessSudo`                                                 |
| `src/utils/installRunner.test.ts`        | Expand existing — currently 6.25% coverage, add tests for stdio piping modes and error capture                                               |
| `src/utils/configGenerator.test.ts`      | Expand existing — currently 52.7% coverage, add edge cases for all integration combinations                                                  |
| `src/utils/credentials.test.ts`          | Expand existing — currently 58.33% coverage, add tests for `loadCredentials`, `saveCredentials`, file I/O error cases                        |
| `src/utils/credentialValidators.test.ts` | Expand existing — currently 40% coverage, add tests for all validator functions (GitHub PAT, Docker token, Cloudflare token, etc.)           |
| `src/validators/prerequisites.test.ts`   | Replace placeholder — currently 0% coverage, add tests for prerequisite checks                                                               |

---

## Test Coverage Targets

| Module                    | Current | Target                   |
| ------------------------- | ------- | ------------------------ |
| `ansibleRunner.ts`        | 0%      | 80%+                     |
| `envParser.ts`            | 0%      | 80%+                     |
| `iacToolboxConfig.ts`     | 0%      | 80%+                     |
| `downloadFiles.ts`        | 0%      | 70%+ (network I/O heavy) |
| `standaloneInstall.ts`    | 0%      | 70%+ (integration heavy) |
| `installRunner.ts`        | 6.25%   | 75%+                     |
| `configGenerator.ts`      | 52.7%   | 85%+                     |
| `credentials.ts`          | 58.33%  | 85%+                     |
| `credentialValidators.ts` | 40%     | 80%+                     |
| `prerequisites.ts`        | 50%     | 75%+                     |

---

## Testing Approach

### Mock Strategy

- **Child processes**: Mock `child_process.spawn` and `child_process.spawnSync` for `ansibleRunner`, `standaloneInstall`, `prerequisites`
- **File system**: Mock `fs` for config/credential file I/O — use in-memory fixtures
- **Network**: Mock `https.get` for GitHub API and file downloads in `downloadFiles.test.ts`
- **Environment**: Use `process.env` manipulation with cleanup in `beforeEach`/`afterEach`

### Critical Paths to Cover

1. **Config generation** — all integration combinations (Vault + Cloudflare, Grafana + Prometheus, etc.), YAML structure validation
2. **Credential management** — parse/serialize round-trip, multi-profile handling, missing file handling
3. **Install orchestration** — env variable injection, stdio modes (inherit vs pipe), error capture, exit code propagation
4. **Download handling** — redirect following, error responses, recursive directory download
5. **Validation** — token format validation, prerequisite checks (Docker, Ansible, sudo)

### Edge Cases

- Empty/missing config files
- Malformed credentials file
- Network failures during download
- Install script missing or non-executable
- Ansible become password in environment
- Profile not found in credentials
- Invalid token formats

---

## Out of Scope

- UI component tests (React/Ink) — deferred to separate UI testing milestone
- End-to-end integration tests — this focuses on unit tests only
- Performance/load testing — not applicable to CLI tool
- Coverage for `dist/` compiled output — source coverage is sufficient
