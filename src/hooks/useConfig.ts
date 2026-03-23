import { useState } from 'react';
import { ConfigManager } from '../core/config-manager.js';
import { Config } from '../core/types.js';

export function useConfig() {
  const [configManager] = useState(() => new ConfigManager());
  const [config, setConfig] = useState<Config>(configManager.getConfig());

  const reload = () => {
    setConfig(configManager.getConfig());
  };

  return { configManager, config, reload };
}
