import { describe, it, expect } from "vitest";
import { DEFAULT_CORS_ORIGINS, parseCorsOrigins, ENV } from "../../src/config/env.config.js";

describe("parseCorsOrigins", () => {
  it("returns default origins when CORS_ORIGINS is undefined", () => {
    const result = parseCorsOrigins(undefined);
    expect(result).toEqual(DEFAULT_CORS_ORIGINS);
  });

  it("parses a comma-separated string into an array of origins", () => {
    const result = parseCorsOrigins("http://a.com,https://b.com");
    expect(result).toEqual(["http://a.com", "https://b.com"]);
  });

  it("trims whitespace from each origin", () => {
    const result = parseCorsOrigins(" http://a.com ,  https://b.com ");
    expect(result).toEqual(["http://a.com", "https://b.com"]);
  });

  it("filters out empty strings from trailing commas", () => {
    const result = parseCorsOrigins(",http://a.com,");
    expect(result).toEqual(["http://a.com"]);
  });
});

describe("TRUST_PROXY", () => {
  it("defaults to 1 when not set", () => {
    expect(ENV.TRUST_PROXY).toBe(1);
  });
});
