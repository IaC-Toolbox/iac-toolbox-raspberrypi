export interface ResolveResult {
  resolved: string;
  missing: string[];
}

/**
 * Find all {{ var_name }} references in yamlText, skip any starting with
 * "ansible_" (those are Ansible-native runtime vars), and resolve the rest
 * from `credentials`. Returns resolved YAML text or a list of missing names.
 */
export function resolveConfigTemplates(
  yamlText: string,
  credentials: Record<string, string | undefined>
): ResolveResult {
  const TEMPLATE_RE = /\{\{\s*([\w.[\]'"]+)\s*\}\}/g;
  const missing: string[] = [];
  const seen = new Set<string>();

  // First pass: collect missing
  let match: RegExpExecArray | null;
  while ((match = TEMPLATE_RE.exec(yamlText)) !== null) {
    const varName = match[1];
    if (varName.startsWith('ansible_')) continue;
    if (!seen.has(varName)) {
      seen.add(varName);
      const value = credentials[varName];
      if (!value) missing.push(varName);
    }
  }

  if (missing.length > 0) return { resolved: '', missing };

  // Second pass: replace
  const resolved = yamlText.replace(
    /\{\{\s*([\w.[\]'"]+)\s*\}\}/g,
    (_full, varName: string) => {
      if (varName.startsWith('ansible_')) return _full;
      return credentials[varName] ?? _full;
    }
  );

  return { resolved, missing: [] };
}
