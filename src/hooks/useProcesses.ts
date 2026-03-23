import { useState, useEffect } from 'react';
import { ProcessManager } from '../core/process-manager.js';
import { ProjectState } from '../core/types.js';

export function useProcesses(manager: ProcessManager) {
  const [states, setStates] = useState<ProjectState[]>(manager.getStates());

  useEffect(() => {
    const onStateChange = () => {
      setStates(manager.getStates());
    };

    manager.on('stateChange', onStateChange);
    manager.on('started', onStateChange);
    manager.on('exited', onStateChange);

    return () => {
      manager.off('stateChange', onStateChange);
      manager.off('started', onStateChange);
      manager.off('exited', onStateChange);
    };
  }, [manager]);

  return { states };
}
