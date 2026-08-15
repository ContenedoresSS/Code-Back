import { describe, it, expect } from "vitest";
import { decodedBase64Size } from "../../src/helpers/base64-size.helper.js";

const b64 = (raw: string): string => Buffer.from(raw, "utf8").toString("base64");

describe("decodedBase64Size", () => {
  it("computes the decoded size of a padded base64 string", () => {
    expect(decodedBase64Size(b64("Hello"))).toBe(5);
  });

  it("computes the decoded size of an unpadded base64 string", () => {
    expect(decodedBase64Size("aGVsbG8")).toBe(5);
  });

  it("returns 0 for an empty string", () => {
    expect(decodedBase64Size("")).toBe(0);
  });

  it("handles strings with padding of length 1", () => {
    expect(decodedBase64Size("aGVsbG9Xb3JsZA")).toBe(10);
  });

  it("never allocates more than the source length", () => {
    const source = b64("a".repeat(1000));
    expect(decodedBase64Size(source)).toBeLessThanOrEqual(source.length);
  });
});
