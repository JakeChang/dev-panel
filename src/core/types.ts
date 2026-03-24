export interface Config {
  version: number;
  defaults: DefaultConfig;
  projects: ProjectConfig[];
}

export interface DefaultConfig {
  logBufferSize: number;
  shutdownTimeout: number;
  autoRestart: boolean;
}

export interface ProjectConfig {
  id: string;
  name: string;
  path: string;
  port: number;
  command: string;
  env: Record<string, string>;
  autoStart: boolean;
}

export interface ProjectState {
  id: string;
  config: ProjectConfig;
  status: 'stopped' | 'starting' | 'running' | 'error';
  pid: number | null;
  startedAt: Date | null;
  lastError: string | null;
}

export interface LogEntry {
  timestamp: Date;
  projectId: string;
  stream: 'stdout' | 'stderr';
  text: string;
}

export const DEFAULT_CONFIG: Config = {
  version: 1,
  defaults: {
    logBufferSize: 1000,
    shutdownTimeout: 5000,
    autoRestart: false,
  },
  projects: [],
};
