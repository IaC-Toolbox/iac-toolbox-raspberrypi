import { CLI_VALIDATION_MAP } from './cli-validation-map.js';

export interface ValidationContext {
  destination: string;
  filePath: string;
  profile: string;
  config: Record<string, unknown>;
}

export interface ValidatorDescriptor {
  fn: (ctx: ValidationContext) => void;
  condition?: string;
}

/**
 * Run all validators registered for `cliName` in CLI_VALIDATION_MAP.
 *
 * Validators with a `condition` key are only executed when
 * ctx.config[condition]?.enabled === true.
 *
 * If `cliName` is not in the map this function is a no-op — callers
 * that want a hard failure on unknown CLIs should check the map directly.
 */
export function validateClis(cliName: string, ctx: ValidationContext): void {
  const descriptors = CLI_VALIDATION_MAP[cliName];
  if (!descriptors) return;

  for (const descriptor of descriptors) {
    if (descriptor.condition) {
      const section = ctx.config[descriptor.condition] as
        | { enabled?: boolean }
        | undefined;
      if (!section?.enabled) continue;
    }
    descriptor.fn(ctx);
  }
}
