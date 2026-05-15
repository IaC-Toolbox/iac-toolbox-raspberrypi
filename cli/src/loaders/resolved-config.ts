import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join, resolve } from 'path';
import yaml from 'js-yaml';
import { loadCredentials } from './credentials-loader.js';
import { resolveConfigTemplates } from '../utils/configResolver.js';
import { resolveConfigPath } from './yaml-loader.js';
import { makePathsAbsolute } from './path-resolver.js';
import { print } from '../design-system/print.js';

/**
 * Resolves credential templates and relative paths in iac-toolbox.yml, then
 * writes the result to a temp file in ~/.iac-toolbox/. Returns the temp file
 * path and resolved YAML string. Caller is responsible for unlinking tmpFile
 * after use.
 */
export function writeResolvedConfig(
  destination: string,
  profile: string,
  filePath?: string
): { tmpFile: string; resolvedYaml: string } {
  const absFilePath = resolve(
    process.cwd(),
    filePath ?? resolveConfigPath(destination)
  );
  const rawYaml = readFileSync(absFilePath, 'utf-8');
  const creds = loadCredentials(profile) as Record<string, string | undefined>;
  const { resolved, missing } = resolveConfigTemplates(rawYaml, creds);

  if (missing.length > 0) {
    print.error('Missing credentials for template variables in config:');
    print.pipe();
    for (const varName of missing) {
      print.pipe(`  ✗ {{ ${varName} }}`);
      print.pipe(`    → run: iac-toolbox credentials set ${varName}`);
      print.pipe();
    }
    print.closeError();
    process.exit(1);
  }

  const parsedConfig = yaml.load(resolved) as Record<string, unknown>;
  const absoluteConfig = makePathsAbsolute(parsedConfig);
  const resolvedYaml = yaml.dump(absoluteConfig, { lineWidth: -1 });

  const iacDir = join(homedir(), '.iac-toolbox');
  mkdirSync(iacDir, { recursive: true });
  const tmpFile = join(iacDir, `resolved-config-${Date.now()}.yml`);
  writeFileSync(tmpFile, resolvedYaml, { mode: 0o600 });

  return { tmpFile, resolvedYaml };
}
