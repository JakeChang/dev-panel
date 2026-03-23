export function terminalLink(text: string, url: string): string {
  // OSC 8 hyperlink sequence
  return `\u001B]8;;${url}\u0007${text}\u001B]8;;\u0007`;
}

export function makeProjectUrl(port: number): string {
  return `http://localhost:${port}`;
}
