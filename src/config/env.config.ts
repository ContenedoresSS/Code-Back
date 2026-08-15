import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

export const DEFAULT_CORS_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:8080",
  "https://codepanel.orchfr.duckdns.org",
];

export function parseCorsOrigins(raw: string | undefined): string[] {
  if (!raw) return DEFAULT_CORS_ORIGINS;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const envSchema = z
  .object({
    PORT: z.string().transform(Number).default(3000),
    JWT_SECRET: z.string().min(20, "Token secret must be at least 20 characteres long"),
    JWT_REFRESH_SECRET: z.string().min(20, "Refresh secret must be at least 20 characteres long"),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    DATABASE_URL: z.string().url("It must be a valid database URL"),
    CORS_ORIGINS: z.string().optional(),
    EMAIL_PROVIDER: z.enum(["resend", "smtp", "none"]).default("none"),
    EMAIL_FROM: z
      .string()
      .email("EMAIL_FROM must be a valid email")
      .default("no-reply@codepanel.local"),
    RESEND_API_KEY: z.string().optional(),
    SMTP_HOST: z.string().default("localhost"),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_SECURE: z
      .string()
      .default("false")
      .transform((v) => v === "true"),
    RESET_CODE_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  })
  .superRefine((env, ctx) => {
    if (env.EMAIL_PROVIDER === "resend" && !env.RESEND_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "RESEND_API_KEY is required when EMAIL_PROVIDER is 'resend'",
        path: ["RESEND_API_KEY"],
      });
    }

    if (env.EMAIL_PROVIDER === "smtp" && !env.SMTP_HOST) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "SMTP_HOST is required when EMAIL_PROVIDER is 'smtp'",
        path: ["SMTP_HOST"],
      });
    }
  });

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("Invalid or missing env varables", _env.error);
  process.exit(1);
}

export const ENV = {
  ..._env.data,
  corsOrigins: parseCorsOrigins(_env.data.CORS_ORIGINS),
};
