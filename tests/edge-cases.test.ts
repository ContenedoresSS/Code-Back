import { describe, it, expect } from "vitest";

describe("Edge Cases - Critical", () => {
  describe("Pagination Helper", () => {
    it("should handle extremely large take values (potential DoS)", async () => {
      const { getPaginationParams } = await import("../src/helpers/pagination.helper.js");
      const mockRequest = (query: Record<string, unknown>) => ({ query }) as any;

      const result = getPaginationParams(mockRequest({ take: "999999999" }));

      expect(result.take).toBe(999999999);
    });

    it("should handle negative take values", async () => {
      const { getPaginationParams } = await import("../src/helpers/pagination.helper.js");
      const mockRequest = (query: Record<string, unknown>) => ({ query }) as any;

      const result = getPaginationParams(mockRequest({ take: "-10" }));

      expect(result.take).toBe(-10);
    });
  });

  describe("Base64 Validator - ReDoS", () => {
    it("should handle very long strings without hanging", async () => {
      const { isBase64 } = await import("../src/helpers/base64-validator.helper.js");

      const longString = "A".repeat(100000);
      const start = Date.now();
      isBase64(longString);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000);
    });

    it("should reject strings with invalid padding", async () => {
      const { isBase64 } = await import("../src/helpers/base64-validator.helper.js");

      expect(isBase64("SGVsbG8===")).toBe(false);
      expect(isBase64("SGVsbG8====")).toBe(false);
    });
  });

  describe("Param Helper", () => {
    it("should handle extremely large ID values", async () => {
      const { parseIdParam } = await import("../src/helpers/param.helper.js");

      const result = parseIdParam("999999999999");

      expect(result).toBe(999999999999);
    });

    it("should handle ID with leading zeros", async () => {
      const { parseIdParam } = await import("../src/helpers/param.helper.js");

      const result = parseIdParam("000123");

      expect(result).toBe(123);
    });

    it("should handle float-like strings", async () => {
      const { parseIdParam } = await import("../src/helpers/param.helper.js");

      const result = parseIdParam("12.5");

      expect(result).toBe(12);
    });
  });
});
