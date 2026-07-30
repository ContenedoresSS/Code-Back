import { describe, it, expect } from "vitest";
import { parseIdParam, parseStringParam } from "../../src/helpers/param.helper.js";

describe("parseIdParam", () => {
  it("parses a valid numeric string", () => {
    expect(parseIdParam("42")).toBe(42);
  });

  it("parses zero", () => {
    expect(parseIdParam("0")).toBe(0);
  });

  it("throws for NaN string", () => {
    expect(() => parseIdParam("abc")).toThrow("ID");
  });

  it("throws for empty string", () => {
    expect(() => parseIdParam("")).toThrow();
  });

  it("throws for whitespace-only string", () => {
    expect(() => parseIdParam("   ")).toThrow();
  });

  it("uses first element when param is an array", () => {
    expect(parseIdParam(["10", "20"])).toBe(10);
  });

  it("throws for non-string value", () => {
    expect(() => parseIdParam(123)).toThrow();
  });

  it("uses custom paramName in error message", () => {
    expect(() => parseIdParam("abc", "ActivityID")).toThrow("ActivityID");
  });

  it("uses default paramName 'ID' when not specified", () => {
    expect(() => parseIdParam("abc")).toThrow("ID");
  });
});

describe("parseStringParam", () => {
  it("returns trimmed string for valid input", () => {
    expect(parseStringParam("  hello  ")).toBe("hello");
  });

  it("returns string as-is when no trimming needed", () => {
    expect(parseStringParam("hello")).toBe("hello");
  });

  it("throws for empty string", () => {
    expect(() => parseStringParam("")).toThrow();
  });

  it("throws for whitespace-only string", () => {
    expect(() => parseStringParam("   ")).toThrow();
  });

  it("uses first element when param is an array", () => {
    expect(parseStringParam(["first", "second"])).toBe("first");
  });

  it("throws for non-string value", () => {
    expect(() => parseStringParam(123)).toThrow();
  });

  it("uses custom paramName in error message", () => {
    expect(() => parseStringParam("", "Name")).toThrow("Name");
  });

  it("uses default paramName when not specified", () => {
    try {
      parseStringParam("");
    } catch (e: any) {
      expect(e.message).toContain("Par");
    }
  });
});
