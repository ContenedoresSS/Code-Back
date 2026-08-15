import { describe, it, expect } from "vitest";
import { validateExecutionInputSize } from "../../src/helpers/execution-size.helper.js";
import type { CodeFile } from "../../src/types/models/execution/code-file.model.js";

const b64 = (raw: string): string => Buffer.from(raw, "utf8").toString("base64");

const limits = { maxCodeBytes: 10, maxStdinBytes: 4 };

const file = (name: string, content: string): CodeFile => ({ name, content });

describe("validateExecutionInputSize", () => {
  it("returns null when code is within the limit", () => {
    expect(validateExecutionInputSize({ code: b64("hello") }, limits)).toBeNull();
  });

  it("returns an error when code exceeds the limit", () => {
    const result = validateExecutionInputSize({ code: b64("hello world") }, limits);
    expect(result).toContain("código");
    expect(result).toContain("10");
  });

  it("returns an error naming the oversized file", () => {
    const result = validateExecutionInputSize(
      { files: [file("main.py", b64("x".repeat(20)))] },
      limits
    );
    expect(result).toContain("main.py");
  });

  it("returns null when all files are within the limit", () => {
    const result = validateExecutionInputSize({ files: [file("a.py", b64("hello"))] }, limits);
    expect(result).toBeNull();
  });

  it("returns an error when stdin exceeds its limit", () => {
    const result = validateExecutionInputSize({ stdin: b64("too long input") }, limits);
    expect(result).toContain("entrada");
  });

  it("returns null when stdin is within the limit", () => {
    expect(validateExecutionInputSize({ stdin: b64("hi") }, limits)).toBeNull();
  });

  it("ignores undefined fields", () => {
    expect(validateExecutionInputSize({}, limits)).toBeNull();
  });
});
