import { describe, it, expect } from "vitest";
import {
  createActivitySchema,
  updateActivitySchema,
} from "../../src/validators/activity.validators.js";

const validCreatePayload = {
  subjectId: 1,
  languageId: 1,
  title: "Suma de dos números",
};

describe("Activity Validators", () => {
  describe("createActivitySchema", () => {
    it("validates payload without rules", () => {
      const result = createActivitySchema.safeParse(validCreatePayload);
      expect(result.success).toBe(true);
    });

    it("rejects payload without subjectId", () => {
      const result = createActivitySchema.safeParse({ languageId: 1, title: "Test" });
      expect(result.success).toBe(false);
    });

    it("keeps a partial rules object as provided", () => {
      const result = createActivitySchema.safeParse({
        ...validCreatePayload,
        rules: { allowCopy: false, allowPaste: false },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rules).toEqual({ allowCopy: false, allowPaste: false });
      }
    });

    it("accepts every rule in the catalog", () => {
      const result = createActivitySchema.safeParse({
        ...validCreatePayload,
        rules: {
          allowCopy: false,
          allowPaste: false,
          allowFileDownload: false,
          allowCodeEdit: false,
          allowFileUpload: false,
          allowLanguageChange: true,
        },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rules?.allowLanguageChange).toBe(true);
      }
    });

    it("accepts an empty rules object", () => {
      const result = createActivitySchema.safeParse({ ...validCreatePayload, rules: {} });
      expect(result.success).toBe(true);
    });

    it("rejects a rule key that is not in the catalog", () => {
      const result = createActivitySchema.safeParse({
        ...validCreatePayload,
        rules: { allowTimeTravel: true },
      });

      expect(result.success).toBe(false);
    });

    it("rejects a known rule key alongside an unknown one", () => {
      const result = createActivitySchema.safeParse({
        ...validCreatePayload,
        rules: { allowCopy: false, allowTimeTravel: true },
      });

      expect(result.success).toBe(false);
    });

    it("rejects a non-boolean rule value", () => {
      const result = createActivitySchema.safeParse({
        ...validCreatePayload,
        rules: { allowCopy: "false" },
      });

      expect(result.success).toBe(false);
    });

    it("rejects rules that is not an object", () => {
      const result = createActivitySchema.safeParse({ ...validCreatePayload, rules: true });
      expect(result.success).toBe(false);
    });

    it("rejects the removed flat allowCopy field", () => {
      const result = createActivitySchema.safeParse({ ...validCreatePayload, allowCopy: false });
      expect(result.success).toBe(false);
    });

    it("rejects the removed flat allowPaste field", () => {
      const result = createActivitySchema.safeParse({ ...validCreatePayload, allowPaste: false });
      expect(result.success).toBe(false);
    });

    it("rejects an unknown top-level field", () => {
      const result = createActivitySchema.safeParse({ ...validCreatePayload, nickname: "x" });
      expect(result.success).toBe(false);
    });
  });

  describe("updateActivitySchema", () => {
    it("validates an empty object", () => {
      const result = updateActivitySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("validates a rules-only update", () => {
      const result = updateActivitySchema.safeParse({ rules: { allowCodeEdit: false } });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rules).toEqual({ allowCodeEdit: false });
      }
    });

    it("rejects a rule key that is not in the catalog", () => {
      const result = updateActivitySchema.safeParse({ rules: { allowScreenshots: false } });
      expect(result.success).toBe(false);
    });

    it("rejects a non-boolean rule value", () => {
      const result = updateActivitySchema.safeParse({ rules: { allowPaste: 1 } });
      expect(result.success).toBe(false);
    });

    it("rejects the removed flat allowCopy field", () => {
      const result = updateActivitySchema.safeParse({ allowCopy: false });
      expect(result.success).toBe(false);
    });

    it("rejects an unknown top-level field", () => {
      const result = updateActivitySchema.safeParse({ nickname: "x" });
      expect(result.success).toBe(false);
    });
  });
});
