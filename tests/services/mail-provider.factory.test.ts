import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    EMAIL_PROVIDER: "smtp",
    EMAIL_FROM: "no-reply@codepanel.local",
    RESEND_API_KEY: undefined as string | undefined,
    SMTP_HOST: "localhost",
    SMTP_PORT: 587,
    SMTP_USER: undefined as string | undefined,
    SMTP_PASS: undefined as string | undefined,
    SMTP_SECURE: false,
  },
}));

vi.mock("../../src/config/env.config.js", () => ({
  ENV: mockEnv,
}));

import mailProviderFactory from "../../src/services/mail/mail-provider.factory.js";
import { SmtpMailProvider } from "../../src/services/mail/smtp-mail-provider.js";
import { ResendMailProvider } from "../../src/services/mail/resend-mail-provider.js";
import { MailProviderNotConfiguredError } from "../../src/services/mail/mail-provider-not-configured.error.js";

describe("MailProviderFactory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an SmtpMailProvider when EMAIL_PROVIDER is 'smtp'", () => {
    mockEnv.EMAIL_PROVIDER = "smtp";

    const provider = mailProviderFactory.create();

    expect(provider).toBeInstanceOf(SmtpMailProvider);
  });

  it("returns a ResendMailProvider when EMAIL_PROVIDER is 'resend'", () => {
    mockEnv.EMAIL_PROVIDER = "resend";
    mockEnv.RESEND_API_KEY = "re_test_key";

    const provider = mailProviderFactory.create();

    expect(provider).toBeInstanceOf(ResendMailProvider);
  });

  it("throws when EMAIL_PROVIDER is 'resend' without RESEND_API_KEY", () => {
    mockEnv.EMAIL_PROVIDER = "resend";
    mockEnv.RESEND_API_KEY = undefined;

    expect(() => mailProviderFactory.create()).toThrow("RESEND_API_KEY is required");
  });

  it("throws MailProviderNotConfiguredError when EMAIL_PROVIDER is 'none'", () => {
    mockEnv.EMAIL_PROVIDER = "none";

    expect(() => mailProviderFactory.create()).toThrow(MailProviderNotConfiguredError);
  });
});
