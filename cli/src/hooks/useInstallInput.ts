import { useInput } from 'ink';

/**
 * Thin wrapper around ink's useInput, called unconditionally so that
 * ink does not toggle stdin raw-mode mid-render.
 *
 * The handler only fires the callback when a failure result is pending;
 * callers pass `null` to suppress action.
 */
export function useInstallInput(onKey: (() => void) | null): void {
  useInput(() => {
    if (onKey) {
      onKey();
    }
  });
}
