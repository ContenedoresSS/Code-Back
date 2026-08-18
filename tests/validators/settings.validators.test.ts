import { describe, it, expect } from "vitest";
import { updateEmailDomainsSchema } from "../../src/validators/settings.validators.js";

describe("Settings Validators", () => {
  describe("updateEmailDomainsSchema", () => {
    it("accepts a valid list of domains", () => {
      const result = updateEmailDomainsSchema.safeParse({ domains: ["uady.mx", "gmail.com"] });
      expect(result.success).toBe(true);
    });

    it("accepts an empty array to clear the restriction", () => {
      const result = updateEmailDomainsSchema.safeParse({ domains: [] });
      expect(result.success).toBe(true);
    });

    it("accepts subdomains", () => {
      const result = updateEmailDomainsSchema.safeParse({ domains: ["alumnos.uady.mx"] });
      expect(result.success).toBe(true);
    });

    it("rejects when domains is not an array", () => {
      const result = updateEmailDomainsSchema.safeParse({ domains: "uady.mx" });
      expect(result.success).toBe(false);
    });

    it("rejects an invalid domain string", () => {
      const result = updateEmailDomainsSchema.safeParse({ domains: ["not_a_domain"] });
      expect(result.success).toBe(false);
    });

    it("rejects an array that contains at least one invalid entry", () => {
      const result = updateEmailDomainsSchema.safeParse({ domains: ["uady.mx", "bad domain"] });
      expect(result.success).toBe(false);
    });

    it("trims surrounding whitespace from each domain", () => {
      const result = updateEmailDomainsSchema.safeParse({ domains: ["  uady.mx  "] });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.domains).toEqual(["uady.mx"]);
      }
    });
  });
});
