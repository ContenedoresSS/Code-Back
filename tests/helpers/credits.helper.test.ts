import { describe, expect, it, vi } from "vitest";
import {
  RAT_CREDITS_ART,
  isKonamiCode,
  printRatCredits,
} from "../../src/helpers/credits.helper.js";

describe("credits.helper", () => {
  it("returns the ascii art with two rats, the initials and the phrase", () => {
    expect(RAT_CREDITS_ART).toContain("__QQ");
    expect(RAT_CREDITS_ART.match(/__QQ/g)?.length).toBe(2);
    expect(RAT_CREDITS_ART).toContain("J&C");
    expect(RAT_CREDITS_ART).toContain("Dos ratas trabajaron aquí");
  });

  it("only accepts the konami code header value", () => {
    expect(isKonamiCode("up-up-down-down-left-right-left-right-b-a")).toBe(true);
    expect(isKonamiCode("anything-else")).toBe(false);
    expect(isKonamiCode(undefined)).toBe(false);
  });

  it("prints the credits art to the console", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    printRatCredits();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("Dos ratas trabajaron aquí"));
    spy.mockRestore();
  });
});
