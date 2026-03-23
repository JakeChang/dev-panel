import React from 'react';
import { Box, Text } from 'ink';
import { ProjectState } from '../core/types.js';
import { STATUS_COLORS, STATUS_SYMBOLS, formatUptime, padEnd } from '../utils/colors.js';
import { makeProjectUrl } from '../utils/terminal-link.js';

interface ProjectListProps {
  states: ProjectState[];
  selectedIndex: number;
}

export function ProjectList({ states, selectedIndex }: ProjectListProps) {
  if (states.length === 0) {
    return (
      <Box flexDirection="column" paddingX={2} paddingY={1}>
        <Text dimColor>No projects configured.</Text>
        <Text dimColor>Run dev-manager add to add a project.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={2}>
      <Text> </Text>
      <Text bold>
        {'#  '}
        {'Name'.padEnd(20)}
        {'Status'.padEnd(12)}
        {'Port'.padEnd(8)}
        {'PID'.padEnd(10)}
        {'Uptime'}
      </Text>
      <Text dimColor>{'--'.repeat(33)}</Text>

      {states.map((state, index) => {
        const isSelected = index === selectedIndex;
        const color = STATUS_COLORS[state.status];
        const symbol = STATUS_SYMBOLS[state.status];
        const prefix = isSelected ? '> ' : '  ';

        return (
          <Box key={state.id}>
            <Text color={isSelected ? 'cyan' : undefined} bold={isSelected}>
              {prefix}
              {padEnd(state.config.name, 20)}
            </Text>
            <Text color={color}>
              {`${symbol} ${state.status.toUpperCase()}`.padEnd(12)}
            </Text>
            <Text>{String(state.config.port).padEnd(8)}</Text>
            <Text>{(state.pid ? String(state.pid) : '--').padEnd(10)}</Text>
            <Text>{formatUptime(state.startedAt)}</Text>
          </Box>
        );
      })}

      <Text> </Text>
      {states[selectedIndex] && (
        <Text>
          <Text dimColor>  URL: </Text>
          <Text color="cyan" underline>
            {makeProjectUrl(states[selectedIndex]!.config.port)}
          </Text>
        </Text>
      )}
      <Text> </Text>
    </Box>
  );
}
