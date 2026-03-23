import React from 'react';
import { Box, Text } from 'ink';

interface ConfirmDialogProps {
  message: string;
}

export function ConfirmDialog({ message }: ConfirmDialogProps) {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="yellow"
      paddingX={2}
      paddingY={1}
    >
      <Text bold color="yellow">⚠ Confirm</Text>
      <Text>{message}</Text>
      <Box marginTop={1}>
        <Text>
          <Text bold color="green">[y]</Text> Yes
          <Text bold color="red">[n]</Text> No
        </Text>
      </Box>
    </Box>
  );
}
