import type { CodeFile } from "../types/models/execution/code-file.model.js";

function isCodeFile(value: unknown): value is CodeFile {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return typeof candidate.name === "string" && typeof candidate.content === "string";
}

// Monaco puede enviar CRLF en Windows aunque el starterCode se guardó con LF;
// sin normalizar, un alumno que no tocó el código recibiría un rechazo.
function decodeAndNormalize(content: string): string {
  return Buffer.from(content, "base64").toString("utf8").replace(/\r\n/g, "\n");
}

function sortedNames(files: CodeFile[]): string[] {
  return files.map((file) => file.name).sort();
}

export function parseStarterCode(stored: unknown): CodeFile[] {
  if (!Array.isArray(stored)) {
    return [];
  }

  return stored.filter(isCodeFile);
}

export function fileNamesMatchStarter(starterCode: CodeFile[], files: CodeFile[]): boolean {
  const expected = sortedNames(starterCode);
  const received = sortedNames(files);

  return (
    expected.length === received.length && expected.every((name, index) => name === received[index])
  );
}

export function codeMatchesStarter(starterCode: CodeFile[], files: CodeFile[]): boolean {
  if (!fileNamesMatchStarter(starterCode, files)) {
    return false;
  }

  return starterCode.every((starterFile) => {
    const submitted = files.find((file) => file.name === starterFile.name);

    if (!submitted) {
      return false;
    }

    return decodeAndNormalize(starterFile.content) === decodeAndNormalize(submitted.content);
  });
}
