import { resolve } from 'path';

export function makePathsAbsolute(obj: unknown): unknown {
  if (typeof obj === 'string') {
    if (obj.startsWith('./') || obj.startsWith('../')) {
      return resolve(process.cwd(), obj);
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(makePathsAbsolute);
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        k,
        makePathsAbsolute(v),
      ])
    );
  }
  return obj;
}
