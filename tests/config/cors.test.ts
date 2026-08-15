import { describe, it, expect, vi } from "vitest";
import type { CorsOptions } from "cors";

type OriginCallback = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
) => void;

async function loadCorsOptions(corsOrigins: string): Promise<OriginCallback> {
  vi.resetModules();
  process.env.CORS_ORIGINS = corsOrigins;
  const mod = await import("../../src/app.js");
  const options = mod.corsOptions as CorsOptions;
  return options.origin as OriginCallback;
}

function callOrigin(
  origin: OriginCallback,
  value: string
): Promise<{ err: Error | null; allow: boolean | undefined }> {
  return new Promise((resolve) => {
    origin(value, (err, allow) => {
      resolve({ err, allow });
    });
  });
}

describe("corsOptions", () => {
  it("allows any origin when CORS_ORIGINS is '*'", async () => {
    const origin = await loadCorsOptions("*");

    const result = await callOrigin(origin, "http://evil.example.com");

    expect(result.err).toBeNull();
    expect(result.allow).toBe(true);
  });

  it("rejects an origin that is not in the whitelist", async () => {
    const origin = await loadCorsOptions("http://localhost:5173");

    const result = await callOrigin(origin, "http://evil.example.com");

    expect(result.err?.message).toBe("Not allowed by CORS");
  });

  it("allows an origin that is in the whitelist", async () => {
    const origin = await loadCorsOptions("http://localhost:5173");

    const result = await callOrigin(origin, "http://localhost:5173");

    expect(result.err).toBeNull();
    expect(result.allow).toBe(true);
  });
});
