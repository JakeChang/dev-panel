import { EventEmitter } from 'node:events';
import { spawn, ChildProcess } from 'node:child_process';
import { default as treeKill } from 'tree-kill';
import { ProjectConfig, ProjectState } from './types.js';
import { LogBuffer } from './log-buffer.js';

interface ProcessEntry {
  state: ProjectState;
  process: ChildProcess | null;
  logBuffer: LogBuffer;
}

export class ProcessManager extends EventEmitter {
  private entries: Map<string, ProcessEntry> = new Map();
  private shutdownTimeout: number;

  constructor(projects: ProjectConfig[], options: { shutdownTimeout?: number; logBufferSize?: number } = {}) {
    super();
    this.shutdownTimeout = options.shutdownTimeout ?? 5000;
    const logBufferSize = options.logBufferSize ?? 1000;

    for (const config of projects) {
      this.entries.set(config.id, {
        state: {
          id: config.id,
          config,
          status: 'stopped',
          pid: null,
          startedAt: null,
          lastError: null,
        },
        process: null,
        logBuffer: new LogBuffer(logBufferSize),
      });
    }
  }

  getStates(): ProjectState[] {
    return Array.from(this.entries.values()).map((e) => ({ ...e.state }));
  }

  getState(id: string): ProjectState | undefined {
    return this.entries.get(id)?.state;
  }

  getLogs(id: string): LogBuffer | undefined {
    return this.entries.get(id)?.logBuffer;
  }

  start(id: string): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    if (entry.state.status === 'running' || entry.state.status === 'starting') return;

    const { config } = entry.state;

    entry.state.status = 'starting';
    entry.state.lastError = null;
    this.emit('stateChange', entry.state);

    const child = spawn(config.command, [], {
      cwd: config.path,
      env: {
        ...process.env,
        ...config.env,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });

    entry.process = child;
    entry.state.pid = child.pid ?? null;
    entry.state.status = 'running';
    entry.state.startedAt = new Date();
    this.emit('stateChange', entry.state);
    this.emit('started', id);

    child.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      const logEntry = {
        timestamp: new Date(),
        projectId: id,
        stream: 'stdout' as const,
        text,
      };
      entry.logBuffer.push(logEntry);
      this.emit('log', logEntry);
    });

    child.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      const logEntry = {
        timestamp: new Date(),
        projectId: id,
        stream: 'stderr' as const,
        text,
      };
      entry.logBuffer.push(logEntry);
      this.emit('log', logEntry);
    });

    child.on('exit', (code, signal) => {
      entry.process = null;
      entry.state.pid = null;

      if (code !== 0 && code !== null) {
        entry.state.status = 'error';
        entry.state.lastError = `Exited with code ${code}`;
      } else if (signal) {
        entry.state.status = 'stopped';
      } else {
        entry.state.status = 'stopped';
      }

      entry.state.startedAt = null;
      this.emit('stateChange', entry.state);
      this.emit('exited', id, code, signal);
    });

    child.on('error', (err) => {
      entry.process = null;
      entry.state.pid = null;
      entry.state.status = 'error';
      entry.state.lastError = err.message;
      entry.state.startedAt = null;
      this.emit('stateChange', entry.state);
      this.emit('error', id, err);
    });
  }

  stop(id: string): Promise<void> {
    return new Promise((resolve) => {
      const entry = this.entries.get(id);
      if (!entry || !entry.process || !entry.state.pid) {
        resolve();
        return;
      }

      const pid = entry.state.pid;

      const forceKillTimer = setTimeout(() => {
        treeKill(pid, 'SIGKILL', () => resolve());
      }, this.shutdownTimeout);

      entry.process.once('exit', () => {
        clearTimeout(forceKillTimer);
        resolve();
      });

      treeKill(pid, 'SIGTERM', (err) => {
        if (err) {
          clearTimeout(forceKillTimer);
          treeKill(pid, 'SIGKILL', () => resolve());
        }
      });
    });
  }

  async restart(id: string): Promise<void> {
    await this.stop(id);
    this.start(id);
  }

  startAll(): void {
    for (const [id, entry] of this.entries) {
      if (entry.state.status === 'stopped' || entry.state.status === 'error') {
        this.start(id);
      }
    }
  }

  async stopAll(): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const [id, entry] of this.entries) {
      if (entry.state.status === 'running' || entry.state.status === 'starting') {
        promises.push(this.stop(id));
      }
    }
    await Promise.all(promises);
  }

  hasRunningProcesses(): boolean {
    for (const entry of this.entries.values()) {
      if (entry.state.status === 'running' || entry.state.status === 'starting') {
        return true;
      }
    }
    return false;
  }
}
