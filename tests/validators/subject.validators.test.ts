import { describe, it, expect } from "vitest";
import { createSubjectSchema, updateSubjectSchema } from "../../src/validators/subject.validators.js";

describe("Subject Validators", () => {
  describe("createSubjectSchema", () => {
    it("validates valid data with name only", () => {
      const result = createSubjectSchema.safeParse({ name: "Mathematics" });
      expect(result.success).toBe(true);
    });

    it("validates valid data with name and imageUrl", () => {
      const result = createSubjectSchema.safeParse({
        name: "Mathematics",
        imageUrl: "https://example.com/image.jpg",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty name", () => {
      const result = createSubjectSchema.safeParse({ name: "" });
      expect(result.success).toBe(false);
    });

    it("rejects name longer than 200 characters", () => {
      const result = createSubjectSchema.safeParse({ name: "a".repeat(201) });
      expect(result.success).toBe(false);
    });

    it("rejects invalid URL format", () => {
      const result = createSubjectSchema.safeParse({
        name: "Mathematics",
        imageUrl: "not-a-url",
      });
      expect(result.success).toBe(false);
    });

    it("rejects imageUrl longer than 500 characters", () => {
      const result = createSubjectSchema.safeParse({
        name: "Mathematics",
        imageUrl: `https://example.com/${"a".repeat(490)}`,
      });
      expect(result.success).toBe(false);
    });

    it("allows missing imageUrl (optional)", () => {
      const result = createSubjectSchema.safeParse({ name: "Mathematics" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.imageUrl).toBeUndefined();
      }
    });
  });

  describe("updateSubjectSchema", () => {
    it("validates empty object (all fields optional)", () => {
      const result = updateSubjectSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("validates partial update with name only", () => {
      const result = updateSubjectSchema.safeParse({ name: "New Name" });
      expect(result.success).toBe(true);
    });

    it("validates partial update with imageUrl only", () => {
      const result = updateSubjectSchema.safeParse({
        imageUrl: "https://example.com/image.jpg",
      });
      expect(result.success).toBe(true);
    });

    it("allows null imageUrl to clear the field", () => {
      const result = updateSubjectSchema.safeParse({ imageUrl: null });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.imageUrl).toBeNull();
      }
    });

    it("rejects empty name if provided", () => {
      const result = updateSubjectSchema.safeParse({ name: "" });
      expect(result.success).toBe(false);
    });

    it("rejects invalid URL format", () => {
      const result = updateSubjectSchema.safeParse({ imageUrl: "not-a-url" });
      expect(result.success).toBe(false);
    });
  });
});
