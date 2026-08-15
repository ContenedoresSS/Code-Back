import { describe, it, expect } from "vitest";
import { parseDockerLogs } from "../../src/helpers/docker-logs.helper.js";

function frame(content: string): Buffer {
  const payload = Buffer.from(content, "utf8");
  const header = Buffer.alloc(8);
  header[0] = 1;
  header.writeUInt32BE(payload.length, 4);
  return Buffer.concat([header, payload]);
}

describe("parseDockerLogs", () => {
  it("handles an empty buffer", () => {
    expect(parseDockerLogs(Buffer.alloc(0))).toBe("");
  });

  it("parses a single multiplexed frame and trims trailing whitespace", () => {
    expect(parseDockerLogs(frame("Hello\n"))).toBe("Hello");
  });

  it("concatenates multiple frames", () => {
    const stream = Buffer.concat([frame("abc"), frame("def")]);
    expect(parseDockerLogs(stream)).toBe("abcdef");
  });
});
