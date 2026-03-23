import React from 'react';
import { Box, Text } from 'ink';
import { LogEntry, ProjectState } from '../core/types.js';
import { formatTimestamp } from '../utils/colors.js';

interface LogViewerProps {
  logs: LogEntry[];
  project: ProjectState | undefined;
  paused: boolean;
  maxLines?: number;
}

export function LogViewer({ logs, project, paused, maxLines = 20 }: LogViewerProps) {
  const displayLogs = paused ? logs : logs.slice(-maxLines);

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Header */}
      <Box>
        <Text bold>
          📋 Logs: {project?.config.name ?? 'Unknown'} (port {project?.config.port ?? '?'})
        </Text>
        <Box flexGrow={1} />
        {paused && <Text color="yellow" bold> ⏸ PAUSED</Text>}
        <Text dimColor>  [Tab] Switch Project</Text>
      </Box>
      <Text dimColor>{'─'.repeat(70)}</Text>

      {/* Log lines */}
      <Box flexDirection="column" flexGrow={1}>
        {displayLogs.length === 0 ? (
          <Text dimColor>No logs yet...</Text>
        ) : (
          displayLogs.map((entry, i) => (
            <Text key={i} color={entry.stream === 'stderr' ? 'red' : undefined}>
              <Text dimColor>{formatTimestamp(entry.timestamp)} </Text>
              {entry.text.trimEnd()}
            </Text>
          ))
        )}
      </Box>
    </Box>
  );
}
