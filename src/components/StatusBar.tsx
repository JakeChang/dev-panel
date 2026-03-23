import React from 'react';
import { Box, Text } from 'ink';
import { ViewMode } from '../core/types.js';

interface StatusBarProps {
  mode: ViewMode;
}

export function StatusBar({ mode }: StatusBarProps) {
  if (mode === 'logs') {
    return (
      <Box paddingX={1}>
        <Text>
          <Text bold color="yellow">[Esc]</Text><Text> Back  </Text>
          <Text bold color="yellow">[Tab]</Text><Text> Next Project  </Text>
          <Text bold color="yellow">[/]</Text><Text> Search  </Text>
          <Text bold color="yellow">[c]</Text><Text> Clear  </Text>
          <Text bold color="yellow">[p]</Text><Text> Pause</Text>
        </Text>
      </Box>
    );
  }

  return (
    <Box paddingX={1}>
      <Text>
        <Text bold color="yellow">[s]</Text><Text>tart  </Text>
        <Text bold color="yellow">[x]</Text><Text>stop  </Text>
        <Text bold color="yellow">[r]</Text><Text>estart  </Text>
        <Text bold color="yellow">[l]</Text><Text>ogs  </Text>
        <Text bold color="yellow">[a]</Text><Text>ll start  </Text>
        <Text bold color="yellow">[X]</Text><Text> stop all  </Text>
        <Text bold color="yellow">[o]</Text><Text>pen  </Text>
        <Text bold color="yellow">[O]</Text><Text> open all  </Text>
        <Text bold color="yellow">[q]</Text><Text>uit</Text>
      </Text>
    </Box>
  );
}
