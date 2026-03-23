import { ProcessManager } from './core/process-manager.js';
import { ProjectState, LogEntry } from './core/types.js';
import { STATUS_SYMBOLS, formatUptime, formatTimestamp, stringWidth } from './utils/colors.js';
import { makeProjectUrl } from './utils/terminal-link.js';
import { exec } from 'node:child_process';

// ANSI
const RESET = '\x1B[0m';
const BOLD = '\x1B[1m';
const DIM = '\x1B[2m';
const UNDERLINE = '\x1B[4m';
const CYAN = '\x1B[36m';
const GREEN = '\x1B[32m';
const YELLOW = '\x1B[33m';
const RED = '\x1B[31m';
const GRAY = '\x1B[90m';
const BG_GRAY = '\x1B[48;5;236m';
const WHITE = '\x1B[37m';

const STATUS_COLOR: Record<string, string> = {
  running: GREEN,
  stopped: GRAY,
  starting: YELLOW,
  error: RED,
};

function padEndDisplay(str: string, width: number): string {
  const w = stringWidth(str);
  return w >= width ? str : str + ' '.repeat(width - w);
}

function stripAnsi(str: string): string {
  return str.replace(/\x1B\[[0-9;]*m/g, '');
}

function truncateToWidth(str: string, maxWidth: number): string {
  let width = 0;
  let result = '';
  for (const char of str) {
    const code = char.codePointAt(0)!;
    const charWidth = (code >= 0x1100 && code <= 0x115f) ||
      (code >= 0x2e80 && code <= 0xa4cf) ||
      (code >= 0xac00 && code <= 0xd7af) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe30 && code <= 0xff60) ||
      (code >= 0x20000 && code <= 0x2fa1f) ? 2 : 1;
    if (width + charWidth > maxWidth) break;
    result += char;
    width += charWidth;
  }
  return result;
}

export class AppRenderer {
  private manager: ProcessManager;
  private selectedIndex = 0;
  private showLogs = false;
  private confirmAction: string | null = null;
  private running = true;
  private logScrollOffset = 0;
  private renderTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(manager: ProcessManager) {
    this.manager = manager;
  }

  private get states(): ProjectState[] {
    return this.manager.getStates();
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      process.stdout.write('\x1B[?1049h\x1B[2J\x1B[H');
      process.stdout.write('\x1B[?25l');

      this.render();

      this.manager.on('stateChange', () => this.scheduleRender());
      this.manager.on('started', () => this.scheduleRender());
      this.manager.on('exited', () => this.scheduleRender());
      this.manager.on('log', () => {
        if (this.showLogs) this.scheduleRender();
      });

      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.on('data', (data) => {
        if (!this.running) return;
        this.handleInput(data, resolve);
      });

      process.stdout.on('resize', () => this.render());
    });
  }

  private scheduleRender() {
    if (this.renderTimer) return;
    this.renderTimer = setTimeout(() => {
      this.renderTimer = null;
      this.render();
    }, 50);
  }

  private handleInput(data: Buffer, quit: () => void) {
    const s = data.toString();
    const states = this.states;

    // Confirm dialog
    if (this.confirmAction) {
      if (s === 'y' || s === 'Y') {
        if (this.confirmAction === 'quit') {
          this.cleanup();
          this.manager.stopAll().then(quit);
          return;
        }
        if (this.confirmAction === 'stopAll') {
          this.manager.stopAll();
        }
        this.confirmAction = null;
        this.render();
      } else if (s === 'n' || s === 'N' || s === '\x1B') {
        this.confirmAction = null;
        this.render();
      }
      return;
    }

    // Quit
    if (s === 'q' || s === '\x03') {
      if (this.manager.hasRunningProcesses()) {
        this.confirmAction = 'quit';
        this.render();
      } else {
        this.cleanup();
        quit();
      }
      return;
    }

    // Navigation: up/down
    if (s === 'j' || s === '\x1B[B') {
      this.selectedIndex = Math.min(this.selectedIndex + 1, states.length - 1);
      this.logScrollOffset = 0;
      this.render();
      return;
    }
    if (s === 'k' || s === '\x1B[A') {
      this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
      this.logScrollOffset = 0;
      this.render();
      return;
    }

    // Right arrow: show logs
    if (s === '\x1B[C' || s === 'l') {
      this.showLogs = true;
      this.logScrollOffset = 0;
      this.render();
      return;
    }
    // Left arrow: hide logs
    if (s === '\x1B[D' || s === 'h') {
      this.showLogs = false;
      this.render();
      return;
    }

    // Number select
    const num = parseInt(s, 10);
    if (num >= 1 && num <= states.length) {
      this.selectedIndex = num - 1;
      this.logScrollOffset = 0;
      this.render();
      return;
    }

    const selected = states[this.selectedIndex];
    if (!selected) return;

    if (s === 's' || s === '\r') {
      this.manager.start(selected.id);
      return;
    }
    if (s === 'x') {
      this.manager.stop(selected.id);
      return;
    }
    if (s === 'r') {
      this.manager.restart(selected.id);
      return;
    }
    if (s === 'a') {
      this.manager.startAll();
      return;
    }
    if (s === 'X') {
      if (this.manager.hasRunningProcesses()) {
        this.confirmAction = 'stopAll';
        this.render();
      }
      return;
    }
    if (s === 'o') {
      exec(`open "${makeProjectUrl(selected.config.port)}"`);
      return;
    }
    if (s === 'O') {
      for (const st of states) {
        if (st.status === 'running') {
          exec(`open "${makeProjectUrl(st.config.port)}"`);
        }
      }
      return;
    }
  }

  private render() {
    const termWidth = process.stdout.columns || 80;
    const termHeight = process.stdout.rows || 24;

    if (this.showLogs) {
      this.renderSplit(termWidth, termHeight);
    } else {
      this.renderDashboard(termWidth, termHeight);
    }
  }

  private renderDashboard(termWidth: number, termHeight: number) {
    const states = this.states;
    const lines: string[] = [];

    lines.push(`${BOLD}${CYAN}  Dev Manager v1.0.0${RESET}                                        ${DIM}[?] Help${RESET}`);
    lines.push(`${DIM}  ${'='.repeat(66)}${RESET}`);

    if (this.confirmAction) {
      lines.push('');
      const msg = this.confirmAction === 'quit'
        ? 'Running servers will be stopped. Quit?'
        : 'Stop all running servers?';
      lines.push(`  ${YELLOW}${BOLD}! ${msg}${RESET}`);
      lines.push(`  ${GREEN}[y]${RESET} Yes  ${RED}[n]${RESET} No`);
      lines.push('');
    } else {
      lines.push('');
      lines.push(`${BOLD}  ${'#'.padEnd(4)}${'Name'.padEnd(20)}${'Status'.padEnd(12)}${'Port'.padEnd(8)}${'PID'.padEnd(10)}${'Uptime'}${RESET}`);
      lines.push(`${DIM}  ${'- '.repeat(33)}${RESET}`);

      for (let i = 0; i < states.length; i++) {
        const state = states[i]!;
        const isSelected = i === this.selectedIndex;
        const color = STATUS_COLOR[state.status] ?? '';
        const symbol = STATUS_SYMBOLS[state.status as keyof typeof STATUS_SYMBOLS] ?? '?';
        const prefix = isSelected ? `${BOLD}${CYAN}> ` : '  ';
        const nameStr = padEndDisplay(state.config.name, 20);
        const statusStr = `${color}${symbol} ${state.status.toUpperCase()}${RESET}`.padEnd(12 + color.length + RESET.length);
        const portStr = String(state.config.port).padEnd(8);
        const pidStr = (state.pid ? String(state.pid) : '--').padEnd(10);
        const uptimeStr = formatUptime(state.startedAt);

        if (isSelected) {
          lines.push(`${prefix}${nameStr}${RESET}${statusStr}${portStr}${pidStr}${uptimeStr}`);
        } else {
          lines.push(`${prefix}${nameStr}${statusStr}${portStr}${pidStr}${uptimeStr}`);
        }
      }

      lines.push('');
      const sel = states[this.selectedIndex];
      if (sel) {
        lines.push(`  ${DIM}URL:${RESET} ${CYAN}${UNDERLINE}${makeProjectUrl(sel.config.port)}${RESET}`);
      }
      lines.push('');
    }

    lines.push(`${DIM}  ${'='.repeat(66)}${RESET}`);
    lines.push(` ${YELLOW}${BOLD}[s]${RESET}tart  ${YELLOW}${BOLD}[x]${RESET}stop  ${YELLOW}${BOLD}[r]${RESET}estart  ${YELLOW}${BOLD}[→]${RESET}logs  ${YELLOW}${BOLD}[a]${RESET}ll start  ${YELLOW}${BOLD}[X]${RESET} stop all  ${YELLOW}${BOLD}[o]${RESET}pen  ${YELLOW}${BOLD}[q]${RESET}uit`);

    process.stdout.write('\x1B[H\x1B[2J');
    process.stdout.write(lines.join('\n') + '\n');
  }

  private renderSplit(termWidth: number, termHeight: number) {
    const states = this.states;
    const leftWidth = 38;
    const dividerWidth = 1;
    const rightWidth = termWidth - leftWidth - dividerWidth;
    const contentHeight = termHeight - 2; // reserve bottom bar

    // Build left panel lines
    const leftLines: string[] = [];
    leftLines.push(`${BOLD}${CYAN} Dev Manager${RESET}`);
    leftLines.push(`${DIM} ${'─'.repeat(leftWidth - 2)}${RESET}`);

    if (this.confirmAction) {
      leftLines.push('');
      const msg = this.confirmAction === 'quit' ? 'Quit?' : 'Stop all?';
      leftLines.push(` ${YELLOW}${BOLD}! ${msg}${RESET}`);
      leftLines.push(` ${GREEN}[y]${RESET} Yes  ${RED}[n]${RESET} No`);
    } else {
      for (let i = 0; i < states.length; i++) {
        const state = states[i]!;
        const isSelected = i === this.selectedIndex;
        const color = STATUS_COLOR[state.status] ?? '';
        const symbol = STATUS_SYMBOLS[state.status as keyof typeof STATUS_SYMBOLS] ?? '?';
        const name = padEndDisplay(state.config.name, 16);
        const port = String(state.config.port);
        const prefix = isSelected ? `${BOLD}${CYAN}▸ ` : '  ';
        const suffix = isSelected ? RESET : '';

        leftLines.push(`${prefix}${color}${symbol}${RESET} ${isSelected ? BOLD : ''}${name}${suffix} ${DIM}:${port}${RESET}`);
      }

      leftLines.push('');
      const sel = states[this.selectedIndex];
      if (sel) {
        const uptimeStr = formatUptime(sel.startedAt);
        leftLines.push(` ${DIM}PID:${RESET} ${sel.pid ?? '--'}  ${DIM}Up:${RESET} ${uptimeStr}`);
        leftLines.push(` ${DIM}URL:${RESET} ${CYAN}${UNDERLINE}${makeProjectUrl(sel.config.port)}${RESET}`);
      }
    }

    // Build right panel (logs)
    const sel = states[this.selectedIndex];
    const logLines: string[] = [];
    const logHeaderText = sel ? ` Logs: ${sel.config.name} ` : ' Logs ';
    const headerTextWidth = stringWidth(stripAnsi(logHeaderText));
    logLines.push(`${BOLD}${WHITE}${BG_GRAY}${logHeaderText}${'─'.repeat(Math.max(0, rightWidth - headerTextWidth))}${RESET}`);

    if (sel) {
      const logBuffer = this.manager.getLogs(sel.id);
      const logHeight = contentHeight - 1; // minus header
      if (logBuffer && logBuffer.length > 0) {
        // Flatten log entries into display lines
        const allDisplayLines: string[] = [];
        const entries = logBuffer.getAll();
        for (const entry of entries) {
          const rawLines = entry.text.split('\n');
          for (const line of rawLines) {
            if (line.length === 0) continue;
            const tsText = formatTimestamp(entry.timestamp);
            const tsWidth = tsText.length + 1; // +1 for trailing space
            const maxLineWidth = rightWidth - tsWidth;
            const streamColor = entry.stream === 'stderr' ? RED : '';
            const streamReset = entry.stream === 'stderr' ? RESET : '';
            if (maxLineWidth <= 0) continue;

            // Wrap long lines into multiple display lines
            let remaining = line;
            let isFirst = true;
            while (remaining.length > 0) {
              const width = maxLineWidth;
              const chunk = truncateToWidth(remaining, width);
              if (chunk.length === 0) break;
              remaining = remaining.slice(chunk.length);

              if (isFirst) {
                const ts = `${DIM}${tsText}${RESET} `;
                allDisplayLines.push(`${ts}${streamColor}${chunk}${streamReset}`);
                isFirst = false;
              } else {
                const pad = ' '.repeat(tsWidth);
                allDisplayLines.push(`${pad}${streamColor}${chunk}${streamReset}`);
              }
            }
          }
        }

        // Auto-scroll to bottom
        const start = Math.max(0, allDisplayLines.length - logHeight);
        const visible = allDisplayLines.slice(start, start + logHeight);
        for (const l of visible) {
          logLines.push(l);
        }
      } else {
        logLines.push(`${DIM} No logs yet...${RESET}`);
      }
    }

    // Compose split view line by line
    const output: string[] = [];
    for (let row = 0; row < contentHeight; row++) {
      const left = row < leftLines.length ? leftLines[row]! : '';
      const right = row < logLines.length ? logLines[row]! : '';

      // Pad left panel to exact width (CJK-aware)
      const leftDisplayWidth = stringWidth(stripAnsi(left));
      const leftPadded = leftDisplayWidth < leftWidth
        ? left + ' '.repeat(leftWidth - leftDisplayWidth)
        : left;

      const divider = `${DIM}│${RESET}`;
      output.push(`${leftPadded}${divider}${right}`);
    }

    // Footer
    output.push(`${DIM}${'─'.repeat(termWidth)}${RESET}`);
    output.push(` ${YELLOW}${BOLD}[s]${RESET}tart ${YELLOW}${BOLD}[x]${RESET}stop ${YELLOW}${BOLD}[r]${RESET}estart ${YELLOW}${BOLD}[←]${RESET}back ${YELLOW}${BOLD}[a]${RESET}ll ${YELLOW}${BOLD}[X]${RESET}stop all ${YELLOW}${BOLD}[o]${RESET}pen ${YELLOW}${BOLD}[q]${RESET}uit`);

    process.stdout.write('\x1B[H\x1B[2J');
    process.stdout.write(output.join('\n') + '\n');
  }

  private cleanup() {
    this.running = false;
    if (this.renderTimer) {
      clearTimeout(this.renderTimer);
      this.renderTimer = null;
    }
    process.stdout.write('\x1B[?25h');
    process.stdout.write('\x1B[?1049l');
    process.stdin.setRawMode(false);
    process.stdin.pause();
    process.stdin.removeAllListeners('data');
    process.stdout.removeAllListeners('resize');
    this.manager.removeAllListeners();
  }
}
