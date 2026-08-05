import { describe, it, expect } from "vitest";
import {
  parseStarterCode,
  fileNamesMatchStarter,
  codeMatchesStarter,
} from "../../src/helpers/submission-rules.helper.js";
import type { CodeFile } from "../../src/types/models/execution/code-file.model.js";

const MAIN_LF = "aW50IG1haW4oKSB7CiAgcmV0dXJuIDA7Cn0=";
const MAIN_CRLF = "aW50IG1haW4oKSB7DQogIHJldHVybiAwOw0KfQ==";
const MAIN_EDITED = "aW50IG1haW4oKSB7CiAgcmV0dXJuIDQyOwp9";
const HELPER = "aW50IGhlbHBlcigpIHsgcmV0dXJuIDE7IH0=";

const starter: CodeFile[] = [{ name: "main.cpp", content: MAIN_LF }];

describe("submission rules helper", () => {
  describe("parseStarterCode", () => {
    it("returns an empty array when nothing is stored", () => {
      expect(parseStarterCode(null)).toEqual([]);
      expect(parseStarterCode(undefined)).toEqual([]);
    });

    it("returns an empty array when the stored value is not an array", () => {
      expect(parseStarterCode({ name: "main.cpp", content: MAIN_LF })).toEqual([]);
      expect(parseStarterCode("main.cpp")).toEqual([]);
    });

    it("parses a valid array of code files", () => {
      expect(parseStarterCode([{ name: "main.cpp", content: MAIN_LF }])).toEqual(starter);
    });

    it("discards entries that are not shaped like a code file", () => {
      const result = parseStarterCode([
        { name: "main.cpp", content: MAIN_LF },
        { name: "broken.cpp" },
        { content: MAIN_LF },
        "not-an-object",
        null,
      ]);

      expect(result).toEqual(starter);
    });

    it("returns an empty array for an empty stored array", () => {
      expect(parseStarterCode([])).toEqual([]);
    });
  });

  describe("fileNamesMatchStarter", () => {
    it("accepts the same file names", () => {
      expect(fileNamesMatchStarter(starter, [{ name: "main.cpp", content: MAIN_EDITED }])).toBe(
        true
      );
    });

    it("ignores the order of the files", () => {
      const twoFiles: CodeFile[] = [
        { name: "main.cpp", content: MAIN_LF },
        { name: "helper.cpp", content: HELPER },
      ];

      expect(
        fileNamesMatchStarter(twoFiles, [
          { name: "helper.cpp", content: HELPER },
          { name: "main.cpp", content: MAIN_LF },
        ])
      ).toBe(true);
    });

    it("rejects an extra file", () => {
      expect(
        fileNamesMatchStarter(starter, [
          { name: "main.cpp", content: MAIN_LF },
          { name: "extra.cpp", content: HELPER },
        ])
      ).toBe(false);
    });

    it("rejects a missing file", () => {
      const twoFiles: CodeFile[] = [
        { name: "main.cpp", content: MAIN_LF },
        { name: "helper.cpp", content: HELPER },
      ];

      expect(fileNamesMatchStarter(twoFiles, [{ name: "main.cpp", content: MAIN_LF }])).toBe(false);
    });

    it("rejects a renamed file", () => {
      expect(fileNamesMatchStarter(starter, [{ name: "renamed.cpp", content: MAIN_LF }])).toBe(
        false
      );
    });
  });

  describe("codeMatchesStarter", () => {
    it("accepts identical content", () => {
      expect(codeMatchesStarter(starter, [{ name: "main.cpp", content: MAIN_LF }])).toBe(true);
    });

    it("accepts content that differs only in line endings", () => {
      expect(codeMatchesStarter(starter, [{ name: "main.cpp", content: MAIN_CRLF }])).toBe(true);
    });

    it("rejects edited content", () => {
      expect(codeMatchesStarter(starter, [{ name: "main.cpp", content: MAIN_EDITED }])).toBe(false);
    });

    it("rejects a different set of file names", () => {
      expect(codeMatchesStarter(starter, [{ name: "renamed.cpp", content: MAIN_LF }])).toBe(false);
    });

    it("rejects an extra file even when the original is untouched", () => {
      expect(
        codeMatchesStarter(starter, [
          { name: "main.cpp", content: MAIN_LF },
          { name: "extra.cpp", content: HELPER },
        ])
      ).toBe(false);
    });

    it("compares each file against its own starter counterpart", () => {
      const twoFiles: CodeFile[] = [
        { name: "main.cpp", content: MAIN_LF },
        { name: "helper.cpp", content: HELPER },
      ];

      expect(
        codeMatchesStarter(twoFiles, [
          { name: "helper.cpp", content: HELPER },
          { name: "main.cpp", content: MAIN_EDITED },
        ])
      ).toBe(false);
    });
  });
});
