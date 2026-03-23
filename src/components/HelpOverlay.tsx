import React from 'react';
import { Box, Text } from 'ink';

export function HelpOverlay() {
  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Text bold color="cyan">Keyboard Shortcuts</Text>
      <Text dimColor>{'─'.repeat(40)}</Text>

      <Box marginTop={1} flexDirection="column">
        <Text bold>Dashboard Mode</Text>
        <Text>  j/↓    Move selection down</Text>
        <Text>  k/↑    Move selection up</Text>
        <Text>  1-9    Select project by number</Text>
        <Text>  s/Enter Start selected project</Text>
        <Text>  x      Stop selected project</Text>
        <Text>  r      Restart selected project</Text>
        <Text>  a      Start all projects</Text>
        <Text>  X      Stop all projects</Text>
        <Text>  l      View logs</Text>
        <Text>  o      Open in browser</Text>
        <Text>  O      Open all in browser</Text>
        <Text>  ?      Toggle this help</Text>
        <Text>  q      Quit</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text bold>Log View Mode</Text>
        <Text>  Esc       Back to dashboard</Text>
        <Text>  Tab       Next project log</Text>
        <Text>  Shift+Tab Previous project log</Text>
        <Text>  c         Clear logs</Text>
        <Text>  p         Pause/resume auto-scroll</Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Press ? to close</Text>
      </Box>
    </Box>
  );
}
