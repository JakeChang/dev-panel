import { useState, useEffect } from 'react';
import { ProcessManager } from '../core/process-manager.js';
import { LogEntry } from '../core/types.js';

export function useLogs(manager: ProcessManager, projectId: string | null) {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    if (!projectId) {
      setLogs([]);
      return;
    }

    // Load existing logs
    const buffer = manager.getLogs(projectId);
    if (buffer) {
      setLogs(buffer.getAll());
    }

    const onLog = (entry: LogEntry) => {
      if (entry.projectId === projectId) {
        setLogs((prev) => [...prev, entry]);
      }
    };

    manager.on('log', onLog);
    return () => {
      manager.off('log', onLog);
    };
  }, [manager, projectId]);

  const clearLogs = () => {
    if (projectId) {
      manager.getLogs(projectId)?.clear();
      setLogs([]);
    }
  };

  return { logs, clearLogs };
}
