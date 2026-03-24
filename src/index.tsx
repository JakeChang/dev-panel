#!/usr/bin/env node
import meow from 'meow';
import path from 'node:path';
import { AppRenderer } from './app.js';
import { ConfigManager } from './core/config-manager.js';
import { ProcessManager } from './core/process-manager.js';

const cli = meow(
  `
  Usage
    $ dev-panel              Launch TUI
    $ dev-panel init         Initialize config
    $ dev-panel add <path>   Add a project
    $ dev-panel remove <id>  Remove a project
    $ dev-panel list         List all projects
    $ dev-panel config       Edit config with $EDITOR

  Options
    --help    Show this help
    --version Show version
`,
  {
    importMeta: import.meta,
    flags: {},
  }
);

const [command, ...args] = cli.input;

async function main() {
  const configManager = new ConfigManager();

  switch (command) {
    case 'init': {
      configManager.save();
      console.log(`Config initialized at ${ConfigManager.getConfigPath()}`);
      break;
    }

    case 'add': {
      const targetPath = args[0];
      if (!targetPath) {
        console.error('Please provide a project path');
        process.exit(1);
      }

      const resolvedPath = path.resolve(targetPath);
      const name = ConfigManager.detectProjectName(resolvedPath);
      const id = path.basename(resolvedPath);
      const isNuxt = ConfigManager.isNuxtProject(resolvedPath);

      if (!isNuxt) {
        console.log('Not a Nuxt project, but adding anyway.');
      }

      const projects = configManager.getProjects();
      const usedPorts = new Set(projects.map((p) => p.port));
      let port = 3000;
      while (usedPorts.has(port)) port++;

      configManager.addProject({
        id,
        name,
        path: resolvedPath,
        port,
        command: 'npm run dev',
        env: {},
        autoStart: false,
      });

      console.log(`Added "${name}" (${resolvedPath}) on port ${port}`);
      break;
    }

    case 'remove': {
      const id = args[0];
      if (!id) {
        console.error('Please provide a project ID');
        process.exit(1);
      }

      if (configManager.removeProject(id)) {
        console.log(`Removed project "${id}"`);
      } else {
        console.error(`Project "${id}" not found`);
        process.exit(1);
      }
      break;
    }

    case 'list': {
      const projects = configManager.getProjects();
      if (projects.length === 0) {
        console.log('No projects configured. Run `dev-panel add <path>` to add one.');
        return;
      }

      console.log('\nRegistered projects:\n');
      for (const p of projects) {
        console.log(`  ${p.id.padEnd(20)} ${p.name.padEnd(20)} :${p.port}  ${p.path}`);
      }
      console.log('');
      break;
    }

    case 'config': {
      const editor = process.env.EDITOR || 'vi';
      const { execFileSync } = await import('node:child_process');
      execFileSync(editor, [ConfigManager.getConfigPath()], { stdio: 'inherit' });
      break;
    }

    default: {
      const config = configManager.getConfig();
      const projects = config.projects;
      if (projects.length === 0) {
        console.log('No projects configured.');
        console.log('Run `dev-panel init` to create config, then `dev-panel add <path>` to add projects.');
        process.exit(0);
      }

      const manager = new ProcessManager(projects, {
        shutdownTimeout: config.defaults.shutdownTimeout,
        logBufferSize: config.defaults.logBufferSize,
      });

      const app = new AppRenderer(manager);
      await app.start();
      break;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
