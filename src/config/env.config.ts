import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

// ─────────────────────────────────────────────────────────────
// Schema helpers
// ─────────────────────────────────────────────────────────────
const intEnv = (defaultValue: number) => z.coerce.number().int().positive().default(defaultValue);

const boolEnv = (defaultValue: boolean) =>
  z
    .string()
    .default(String(defaultValue))
    .transform((value) => value === "true");

const emailEnv = (defaultValue: string) =>
  z.string().email("EMAIL_FROM must be a valid email").default(defaultValue);

// ─────────────────────────────────────────────────────────────
// CORS
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// Server
// ─────────────────────────────────────────────────────────────
const serverSchema = {
  PORT: intEnv(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().url("It must be a valid database URL"),
  TRUST_PROXY: z.coerce.number().int().positive().default(1),
};

// ─────────────────────────────────────────────────────────────
// Auth (JWT)
// ─────────────────────────────────────────────────────────────
const authSchema = {
  JWT_SECRET: z.string().min(20, "Token secret must be at least 20 characteres long"),
  JWT_REFRESH_SECRET: z.string().min(20, "Refresh secret must be at least 20 characteres long"),
};

// ─────────────────────────────────────────────────────────────
// CORS
// ─────────────────────────────────────────────────────────────
const corsSchema = {
  CORS_ORIGINS: z.string().optional(),
};

// ─────────────────────────────────────────────────────────────
// Mail (password recovery)
// ─────────────────────────────────────────────────────────────
const mailSchema = {
  EMAIL_PROVIDER: z.enum(["resend", "smtp", "none"]).default("none"),
  EMAIL_FROM: emailEnv("no-reply@codepanel.local"),
  RESEND_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: intEnv(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: boolEnv(false),
  RESET_CODE_TTL_MINUTES: intEnv(15),
  MAIL_TEMPLATES_DIR: z.string().optional(),
};

// ─────────────────────────────────────────────────────────────
// Execution engine (Docker sandbox)
// ─────────────────────────────────────────────────────────────
const executionSchema = {
  EXECUTION_MEMORY_MB: intEnv(128),
  EXECUTION_CPU_QUOTA: intEnv(50000),
  EXECUTION_PIDS_LIMIT: intEnv(30),
  EXECUTION_TIMEOUT_MS: intEnv(10000),
  EXECUTION_AUTO_REMOVE: boolEnv(false),
  EXECUTION_READONLY_ROOTFS: boolEnv(false),
  EXECUTION_NO_NEW_PRIVILEGES: boolEnv(true),
  EXECUTION_MAX_CONCURRENCY: intEnv(5),
  EXECUTION_QUEUE_TIMEOUT_MS: intEnv(30000),
};

// ─────────────────────────────────────────────────────────────
// Request body limits
// ─────────────────────────────────────────────────────────────
const bodySchema = {
  MAX_REQUEST_BODY: z.string().min(1).default("1mb"),
  EXECUTION_MAX_CODE_BYTES: intEnv(262144),
  EXECUTION_MAX_STDIN_BYTES: intEnv(65536),
};

const envSchema = z
  .object({
    ...serverSchema,
    ...authSchema,
    ...corsSchema,
    ...mailSchema,
    ...executionSchema,
    ...bodySchema,
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

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid or missing env variables", parsedEnv.error);
  process.exit(1);
}

export const ENV = {
  ...parsedEnv.data,
  corsOrigins: parseCorsOrigins(parsedEnv.data.CORS_ORIGINS),
};
