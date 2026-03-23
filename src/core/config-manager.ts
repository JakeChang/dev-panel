import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Config, ProjectConfig, DEFAULT_CONFIG } from './types.js';

const CONFIG_DIR = path.join(os.homedir(), '.dev-manager');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

export class ConfigManager {
  private config: Config;

  constructor() {
    this.config = this.load();
  }

  private load(): Config {
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
        return JSON.parse(raw) as Config;
      }
    } catch {
      // Fall through to default
    }
    return { ...DEFAULT_CONFIG, projects: [] };
  }

  save(): void {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(this.config, null, 2), 'utf-8');
  }

  getConfig(): Config {
    return this.config;
  }

  getProjects(): ProjectConfig[] {
    return this.config.projects;
  }

  addProject(project: ProjectConfig): void {
    const existing = this.config.projects.findIndex((p) => p.id === project.id);
    if (existing >= 0) {
      this.config.projects[existing] = project;
    } else {
      this.config.projects.push(project);
    }
    this.save();
  }

  removeProject(id: string): boolean {
    const idx = this.config.projects.findIndex((p) => p.id === id);
    if (idx >= 0) {
      this.config.projects.splice(idx, 1);
      this.save();
      return true;
    }
    return false;
  }

  static getConfigPath(): string {
    return CONFIG_PATH;
  }

  static isNuxtProject(dirPath: string): boolean {
    return fs.existsSync(path.join(dirPath, 'nuxt.config.ts')) ||
           fs.existsSync(path.join(dirPath, 'nuxt.config.js'));
  }

  static detectProjectName(dirPath: string): string {
    try {
      const pkgPath = path.join(dirPath, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        if (pkg.name) return pkg.name;
      }
    } catch {
      // Fall through
    }
    return path.basename(dirPath);
  }
}
