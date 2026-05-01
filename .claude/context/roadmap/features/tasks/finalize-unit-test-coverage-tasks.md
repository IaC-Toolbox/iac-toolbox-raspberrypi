# Tasks: Unit Test Coverage — Complete placeholder tests and add missing coverage

Source: 002-finalize-unit-test-coverage.md
Repo: /Users/vvasylkovskyi/git/iac-toolbox-cli
Branch: feat/finalize-unit-test-coverage
Base branch: feature/finalize-unit-tests
Worktree: /Users/vvasylkovskyi/git/iac-toolbox-cli/.claude/worktrees/session
Status: failed

## Tasks

- [ ] 1. Replace placeholder tests in `ansibleRunner.test.ts` — add tests for buildInstallEnv, resolveInstallScript, installScriptExists, runInstallScript with mocked spawn
- [ ] 2. Replace placeholder tests in `envParser.test.ts` — add tests for parsing .env format
- [ ] 3. Replace placeholder tests in `iacToolboxConfig.test.ts` — add tests for loading/saving iac-toolbox.yml
- [ ] 4. Create new test file `downloadFiles.test.ts` — add tests for downloadFile, fetchGitHubDirectory, downloadGitHubDirectory with mocked https
- [ ] 5. Create new test file `standaloneInstall.test.ts` — add tests for runStandaloneInstall, configFileExists, checkPasswordlessSudo
- [ ] 6. Expand `installRunner.test.ts` — add tests for stdio piping modes and error capture (target 75%+ coverage)
- [ ] 7. Expand `configGenerator.test.ts` — add edge cases for all integration combinations (target 85%+ coverage)
- [ ] 8. Expand `credentials.test.ts` — add tests for loadCredentials, saveCredentials, file I/O error cases (target 85%+ coverage)
- [ ] 9. Expand `credentialValidators.test.ts` — add tests for all validator functions (target 80%+ coverage)
- [ ] 10. Replace placeholder tests in `prerequisites.test.ts` — add tests for prerequisite checks (target 75%+ coverage)
- [ ] 11. Run full test suite and verify coverage targets are met
- [ ] 12. Run validation commands (lint, format:check, typecheck, test:ci, build)
