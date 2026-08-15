export function decodedBase64Size(str: string): number {
  const padding = str.endsWith("==") ? 2 : str.endsWith("=") ? 1 : 0;
  return Math.floor((str.length * 3) / 4) - padding;
}
