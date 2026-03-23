export const STATUS_COLORS = {
  running: 'green',
  stopped: 'gray',
  starting: 'yellow',
  error: 'red',
} as const;

export const STATUS_SYMBOLS = {
  running: '●',
  stopped: '○',
  starting: '◐',
  error: '✖',
} as const;

export function formatUptime(startedAt: Date | null): string {
  if (!startedAt) return '--';

  const diff = Date.now() - startedAt.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

export function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour12: false });
}

/**
 * Get the display width of a string, accounting for fullwidth characters (CJK etc.)
 */
export function stringWidth(str: string): number {
  let width = 0;
  for (const char of str) {
    const code = char.codePointAt(0)!;
    if (isFullwidth(code)) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

/**
 * Pad a string to a target display width with spaces.
 */
export function padEnd(str: string, targetWidth: number): string {
  const currentWidth = stringWidth(str);
  if (currentWidth >= targetWidth) return str;
  return str + ' '.repeat(targetWidth - currentWidth);
}

function isFullwidth(code: number): boolean {
  return (
    (code >= 0x1100 && code <= 0x115f) ||   // Hangul Jamo
    (code >= 0x2e80 && code <= 0x303e) ||    // CJK Radicals
    (code >= 0x3040 && code <= 0x33bf) ||    // Japanese/CJK
    (code >= 0x3400 && code <= 0x4dbf) ||    // CJK Unified Ext A
    (code >= 0x4e00 && code <= 0xa4cf) ||    // CJK Unified
    (code >= 0xac00 && code <= 0xd7af) ||    // Hangul Syllables
    (code >= 0xf900 && code <= 0xfaff) ||    // CJK Compat
    (code >= 0xfe30 && code <= 0xfe6f) ||    // CJK Compat Forms
    (code >= 0xff01 && code <= 0xff60) ||    // Fullwidth Forms
    (code >= 0xffe0 && code <= 0xffe6) ||    // Fullwidth Signs
    (code >= 0x20000 && code <= 0x2fa1f)     // CJK Ext B-F
  );
}
