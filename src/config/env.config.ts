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

const envSchema = z.object({
  PORT: z.string().transform(Number).default(3000),
  JWT_SECRET: z.string().min(20, "Token secret must be at least 20 characteres long"),
  JWT_REFRESH_SECRET: z.string().min(20, "Refresh secret must be at least 20 characteres long"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().url("It must be a valid database URL"),
  CORS_ORIGINS: z.string().optional(),
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
