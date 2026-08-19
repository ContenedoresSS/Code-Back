import { describe, it, expect } from "vitest";
import type { CorsOptions } from "cors";
import { buildCorsOptions } from "../../src/helpers/cors.helper.js";

type OriginCallback = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
) => void;

function callOrigin(
  options: CorsOptions,
  value: string
): Promise<{ err: Error | null; allow: boolean | undefined }> {
  const origin = options.origin as OriginCallback;
  return new Promise((resolve) => {
    origin(value, (err, allow) => {
      resolve({ err, allow });
    });
  });
}

describe("corsOptions", () => {
  it("allows any origin when the whitelist contains '*'", async () => {
    const options = buildCorsOptions(["*"]);

    const result = await callOrigin(options, "http://evil.example.com");

    expect(result.err).toBeNull();
    expect(result.allow).toBe(true);
  });

  it("rejects an origin that is not in the whitelist", async () => {
    const options = buildCorsOptions(["http://localhost:5173"]);

    const result = await callOrigin(options, "http://evil.example.com");

    expect(result.err?.message).toBe("Not allowed by CORS");
  });

  it("allows an origin that is in the whitelist", async () => {
    const options = buildCorsOptions(["http://localhost:5173"]);

    const result = await callOrigin(options, "http://localhost:5173");

    expect(result.err).toBeNull();
    expect(result.allow).toBe(true);
  });

  it("allows requests without an origin (curl, server-to-server)", async () => {
    const options = buildCorsOptions(["http://localhost:5173"]);

    const result = await callOrigin(options, "");

    expect(result.err).toBeNull();
    expect(result.allow).toBe(true);
  });
});
