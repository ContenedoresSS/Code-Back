import { describe, it, expect } from "vitest";
import {
  normalizeDomain,
  extractEmailDomain,
  isEmailDomainAllowed,
} from "../../src/helpers/email-domain.helper.js";

describe("normalizeDomain", () => {
  it("lowercases the domain", () => {
    expect(normalizeDomain("UADY.MX")).toBe("uady.mx");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeDomain("  uady.mx  ")).toBe("uady.mx");
  });
});

describe("extractEmailDomain", () => {
  it("extracts the domain part of a valid email", () => {
    expect(extractEmailDomain("alumno@uady.mx")).toBe("uady.mx");
  });

  it("lowercases the extracted domain", () => {
    expect(extractEmailDomain("alumno@UADY.MX")).toBe("uady.mx");
  });

  it("returns empty string for an email without '@'", () => {
    expect(extractEmailDomain("notanemail")).toBe("");
  });

  it("returns empty string for an email with trailing '@'", () => {
    expect(extractEmailDomain("alumno@")).toBe("");
  });
});

describe("isEmailDomainAllowed", () => {
  it("allows any email when the allowed list is empty", () => {
    expect(isEmailDomainAllowed("alumno@uady.mx", [])).toBe(true);
  });

  it("allows an email whose domain is in the list", () => {
    expect(isEmailDomainAllowed("alumno@uady.mx", ["uady.mx"])).toBe(true);
  });

  it("allows an email whose domain matches case-insensitively", () => {
    expect(isEmailDomainAllowed("alumno@UADY.MX", ["uady.mx"])).toBe(true);
  });

  it("rejects an email whose domain is not in the list", () => {
    expect(isEmailDomainAllowed("alumno@gmail.com", ["uady.mx"])).toBe(false);
  });

  it("rejects a subdomain when only the parent domain is allowed", () => {
    expect(isEmailDomainAllowed("alumno@sub.uady.mx", ["uady.mx"])).toBe(false);
  });
});
