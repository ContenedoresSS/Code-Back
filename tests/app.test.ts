import { describe, it, expect } from "vitest";
import app from "../src/app.js";

describe("Express app proxy configuration", () => {
  it("trusts the first proxy hop so rate limiting sees the real client IP", () => {
    expect(app.get("trust proxy")).toBe(1);
  });
});
