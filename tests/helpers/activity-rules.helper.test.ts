import { describe, it, expect } from "vitest";
import {
  getDefaultActivityRules,
  resolveActivityRules,
  mergeActivityRules,
} from "../../src/helpers/activity-rules.helper.js";

describe("activity rules helper", () => {
  describe("getDefaultActivityRules", () => {
    it("returns every rule in the catalog", () => {
      const rules = getDefaultActivityRules();

      expect(Object.keys(rules).sort()).toEqual([
        "allowCodeEdit",
        "allowCopy",
        "allowFileDownload",
        "allowFileUpload",
        "allowLanguageChange",
        "allowPaste",
      ]);
    });

    it("defaults allowLanguageChange to false and the rest to true", () => {
      expect(getDefaultActivityRules()).toEqual({
        allowCopy: true,
        allowPaste: true,
        allowFileDownload: true,
        allowCodeEdit: true,
        allowFileUpload: true,
        allowLanguageChange: false,
      });
    });

    it("returns a fresh object on every call", () => {
      const first = getDefaultActivityRules();
      first.allowCopy = false;

      expect(getDefaultActivityRules().allowCopy).toBe(true);
    });
  });

  describe("resolveActivityRules", () => {
    it("returns defaults when nothing is stored", () => {
      expect(resolveActivityRules(null)).toEqual(getDefaultActivityRules());
    });

    it("returns defaults when stored value is not an object", () => {
      expect(resolveActivityRules("not-an-object")).toEqual(getDefaultActivityRules());
      expect(resolveActivityRules(42)).toEqual(getDefaultActivityRules());
      expect(resolveActivityRules(undefined)).toEqual(getDefaultActivityRules());
    });

    it("returns defaults when stored value is an array", () => {
      expect(resolveActivityRules([{ allowCopy: false }])).toEqual(getDefaultActivityRules());
    });

    it("fills missing rules with their defaults", () => {
      const result = resolveActivityRules({ allowCopy: false, allowPaste: false });

      expect(result).toEqual({
        allowCopy: false,
        allowPaste: false,
        allowFileDownload: true,
        allowCodeEdit: true,
        allowFileUpload: true,
        allowLanguageChange: false,
      });
    });

    it("keeps stored values that differ from the default", () => {
      const result = resolveActivityRules({ allowLanguageChange: true, allowCodeEdit: false });

      expect(result.allowLanguageChange).toBe(true);
      expect(result.allowCodeEdit).toBe(false);
    });

    it("discards keys that are not in the catalog", () => {
      const result = resolveActivityRules({ allowCopy: false, allowTimeTravel: true });

      expect(result).not.toHaveProperty("allowTimeTravel");
      expect(result.allowCopy).toBe(false);
    });

    it("falls back to the default when a stored value is not a boolean", () => {
      const result = resolveActivityRules({ allowCopy: "no", allowPaste: null });

      expect(result.allowCopy).toBe(true);
      expect(result.allowPaste).toBe(true);
    });
  });

  describe("mergeActivityRules", () => {
    it("overrides only the rules present in the patch", () => {
      const current = getDefaultActivityRules();

      const result = mergeActivityRules(current, { allowCopy: false });

      expect(result.allowCopy).toBe(false);
      expect(result.allowPaste).toBe(true);
      expect(result.allowCodeEdit).toBe(true);
      expect(result.allowLanguageChange).toBe(false);
    });

    it("returns the current rules when the patch is empty", () => {
      const current = { ...getDefaultActivityRules(), allowPaste: false };

      expect(mergeActivityRules(current, {})).toEqual(current);
    });

    it("does not mutate the received rules", () => {
      const current = getDefaultActivityRules();

      mergeActivityRules(current, { allowCopy: false });

      expect(current.allowCopy).toBe(true);
    });

    it("ignores patch values that are undefined", () => {
      const current = { ...getDefaultActivityRules(), allowCopy: false };

      const result = mergeActivityRules(current, { allowCopy: undefined });

      expect(result.allowCopy).toBe(false);
    });
  });
});
