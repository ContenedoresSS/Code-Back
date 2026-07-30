import { describe, it, expect } from "vitest";
import { getPaginationParams } from "../../src/helpers/pagination.helper.js";
import type { Request } from "express";

const mockRequest = (query: Record<string, unknown> = {}): Request => {
  return { query } as unknown as Request;
};

describe("getPaginationParams", () => {
  it("returns default skip=0 and take=10 when no query params", () => {
    const result = getPaginationParams(mockRequest());
    expect(result).toEqual({ skip: 0, take: 10 });
  });

  it("respects custom defaultTake parameter", () => {
    const result = getPaginationParams(mockRequest(), 25);
    expect(result).toEqual({ skip: 0, take: 25 });
  });

  it("parses valid skip and take values", () => {
    const result = getPaginationParams(mockRequest({ skip: "5", take: "20" }));
    expect(result).toEqual({ skip: 5, take: 20 });
  });

  it("returns defaults when skip is NaN", () => {
    const result = getPaginationParams(mockRequest({ skip: "abc" }));
    expect(result).toEqual({ skip: 0, take: 10 });
  });

  it("returns defaults when take is NaN", () => {
    const result = getPaginationParams(mockRequest({ take: "xyz" }));
    expect(result).toEqual({ skip: 0, take: 10 });
  });

  it("handles negative skip values", () => {
    const result = getPaginationParams(mockRequest({ skip: "-5", take: "10" }));
    expect(result).toEqual({ skip: -5, take: 10 });
  });

  it("handles array params by using default (NaN)", () => {
    const result = getPaginationParams(mockRequest({ skip: ["1", "2"], take: "10" }));
    expect(result).toEqual({ skip: 0, take: 10 });
  });

  it("handles non-string query values", () => {
    const result = getPaginationParams(mockRequest({ skip: 5 as any, take: 10 as any }));
    expect(result).toEqual({ skip: 0, take: 10 });
  });
});
