// Manual mock for useInstallInput.
// Captures the latest onKey callback so tests can simulate a key press.

let _handler: (() => void) | null = null;

export function useInstallInput(onKey: (() => void) | null): void {
  _handler = onKey;
}

/** Call from tests to simulate the user pressing a key. */
export function __simulateKeyPress(): void {
  if (_handler) {
    _handler();
  }
}

/** Reset captured state between tests. */
export function __reset(): void {
  _handler = null;
}
