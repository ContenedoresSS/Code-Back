import { describe, it, expect, vi } from "vitest";

vi.mock("dotenv", () => ({
  default: { config: () => ({}) },
}));

const ENV_KEYS = ["EMAIL_PROVIDER", "RESEND_API_KEY", "SMTP_HOST"] as const;

async function importEnv(
  emailProvider?: string,
  resendKey?: string,
  smtpHost?: string
): Promise<Record<string, unknown>> {
  vi.resetModules();

  const saved = new Map<string, string | undefined>();
  for (const key of ENV_KEYS) {
    saved.set(key, process.env[key]);
    delete process.env[key];
  }

  if (emailProvider !== undefined) process.env.EMAIL_PROVIDER = emailProvider;
  if (resendKey !== undefined) process.env.RESEND_API_KEY = resendKey;
  if (smtpHost !== undefined) process.env.SMTP_HOST = smtpHost;

  try {
    const mod = await import("../../src/config/env.config.js");
    return mod.ENV as Record<string, unknown>;
  } finally {
    for (const key of ENV_KEYS) {
      const value = saved.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

describe("env.config email validation", () => {
  it("defaults EMAIL_PROVIDER to 'none' and SMTP_HOST to 'localhost'", async () => {
    const env = await importEnv();

    expect(env.EMAIL_PROVIDER).toBe("none");
    expect(env.SMTP_HOST).toBe("localhost");
  });

  it("parses the 'none' provider without requiring credentials", async () => {
    const env = await importEnv("none");

    expect(env.EMAIL_PROVIDER).toBe("none");
    expect(env.RESEND_API_KEY).toBeUndefined();
  });

  it("parses resend configuration when provider is resend", async () => {
    const env = await importEnv("resend", "re_test_key");

    expect(env.EMAIL_PROVIDER).toBe("resend");
    expect(env.RESEND_API_KEY).toBe("re_test_key");
  });

  it("exits when provider is resend without RESEND_API_KEY", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });

    await expect(importEnv("resend")).rejects.toThrow("process.exit called");

    exitSpy.mockRestore();
  });
});
