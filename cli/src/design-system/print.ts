import chalk from 'chalk';
import { Colors, Symbols } from './index.js';

let _progressActive = false;

// Map design system color tokens to chalk functions
const colorFn = (name: string): ((s: string) => string) => {
  const map: Record<string, (s: string) => string> = {
    cyan: chalk.cyan,
    green: chalk.green,
    red: chalk.red,
    yellow: chalk.yellow,
    gray: chalk.gray,
    white: chalk.white,
  };
  return map[name] ?? ((s: string) => s);
};

const primary = colorFn(Colors.primary); // cyan  — step headers
const success = colorFn(Colors.success); // green — success lines
const error = colorFn(Colors.error); // red   — error lines
const warning = colorFn(Colors.warning); // yellow — warning lines
const muted = colorFn(Colors.muted); // gray  — pipes, corners, dividers

// Trim surrounding whitespace that tokens include for Ink rendering
const sym = {
  step: Symbols.active.trim(), // ◆
  done: Symbols.done.trim(), // ✔
  fail: Symbols.fail.trim(), // ✗
  pipe: Symbols.pipe.trim(), // │
  corner: Symbols.corner.trim(), // └
  warn: Symbols.warning.trim(), // ⚠
  waiting: Symbols.spinner[0].trim(), // ◜
};

export const print = {
  /** ◆  Step title (cyan) */
  step: (msg: string) => console.log(primary(`${sym.step}  ${msg}`)),

  /** │  Informational line */
  pipe: (msg: string = '') =>
    console.log(muted(msg ? `${sym.pipe}  ${msg}` : sym.pipe)),

  /** │  ✔ Success line (green) */
  success: (msg: string) =>
    console.log(`${muted(sym.pipe)}  ${success(`${sym.done} ${msg}`)}`),

  /** │  ✗ Error line (red) — writes to stderr */
  error: (msg: string) =>
    console.error(`${muted(sym.pipe)}  ${error(`${sym.fail} ${msg}`)}`),

  /** │  ⚠ Warning line (yellow) — writes to stderr */
  warning: (msg: string) =>
    console.error(`${muted(sym.pipe)}  ${warning(`${sym.warn} ${msg}`)}`),

  /** │  ◜ Waiting/spinner line (muted) */
  waiting: (msg: string) =>
    console.log(muted(`${sym.pipe}  ${sym.waiting} ${msg}`)),

  /** └  Closing corner (muted) */
  close: () => console.log(muted(sym.corner)),

  /** └  Closing corner on stderr (use inside error blocks) */
  closeError: () => console.error(muted(sym.corner)),

  /** Blank line */
  blank: () => console.log(''),

  /** │  ══...══  Section divider (muted) */
  divider: () =>
    console.log(muted(`${sym.pipe}  ════════════════════════════════════════`)),

  /**
   * Live progress bar — overwrites the current terminal line using ANSI cursor
   * control. Safe to call repeatedly; each call replaces the previous bar.
   * Degrades gracefully when stdout is not a TTY.
   */
  progress: (current: number, total: number, label: string) => {
    const cols = process.stdout.columns ?? 80;
    const barWidth = Math.min(40, cols - 20);
    const pct = total > 0 ? Math.round((current / total) * 100) : 0;
    const filled = total > 0 ? Math.round((current / total) * barWidth) : 0;
    const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(barWidth - filled);
    const truncLabel = label.slice(0, cols - barWidth - 16);
    const line = chalk.gray(
      `${sym.pipe}  [${bar}] ${String(pct).padStart(3)}%  ${truncLabel}`
    );
    if (_progressActive) {
      process.stdout.write('\x1B[1A\x1B[2K');
    }
    process.stdout.write(line + '\n');
    _progressActive = true;
  },

  /**
   * Clear the active progress line. Call once after the operation completes
   * so the next print.step() / print.success() starts on a clean line.
   */
  progressDone: () => {
    if (_progressActive) {
      process.stdout.write('\x1B[1A\x1B[2K');
      _progressActive = false;
    }
  },

  /**
   * Full failure block for a failed install step.
   * Writes to stderr.
   */
  stepFailure: (stepName: string, retryCommand: string) => {
    console.error(muted(sym.pipe));
    console.error(
      `${muted(sym.pipe)}  ${error(`${sym.fail} Install failed at: ${stepName}`)}`
    );
    console.error(
      muted(`${sym.pipe}  Check Ansible output above for details.`)
    );
    console.error(muted(sym.pipe));
    console.error(muted(`${sym.pipe}  To retry from this step:`));
    console.error(muted(`${sym.pipe}     iac-toolbox ${retryCommand}`));
    console.error(muted(sym.pipe));
    console.error(muted(`${sym.pipe}  To retry the full apply:`));
    console.error(
      muted(
        `${sym.pipe}     iac-toolbox platform apply --filePath=./iac-toolbox.yml`
      )
    );
    console.error(muted(sym.corner));
  },
};
