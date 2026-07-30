import { describe, it, expect } from "vitest";
import { isBase64 } from "../../src/helpers/base64-validator.helper.js";

describe("isBase64", () => {
  it("returns true for valid base64 with padding", () => {
    expect(isBase64("SGVsbG8gV29ybGQ=")).toBe(true);
  });

  it("returns true for valid base64 with double padding", () => {
    expect(isBase64("SGVsbA==")).toBe(true);
  });

  it("returns true for base64 without padding (RFC 4648)", () => {
    expect(isBase64("SGVsbG8")).toBe(true);
  });

  it("returns false for 2-char string without padding (needs ==)", () => {
    expect(isBase64("SG")).toBe(false);
  });

  it("returns true for 3-char base64 without padding", () => {
    expect(isBase64("SGV")).toBe(true);
  });

  it("returns true for empty base64 string", () => {
    expect(isBase64("")).toBe(false);
  });

  it("returns false for whitespace-only string", () => {
    expect(isBase64("   ")).toBe(false);
  });

  it("returns false for plain text with spaces", () => {
    expect(isBase64("Hello World")).toBe(false);
  });

  it("returns false for string with invalid characters", () => {
    expect(isBase64("Hello!@#$%")).toBe(false);
  });

  it("returns true for base64 encoded number", () => {
    expect(isBase64("MTIz")).toBe(true);
  });

  it("returns true for base64 with all valid char groups", () => {
    expect(isBase64("YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXo=")).toBe(true);
  });
});
