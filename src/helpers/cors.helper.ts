import type { CorsOptions } from "cors";

export function buildCorsOptions(origins: string[]): CorsOptions {
  return {
    origin: (origin, callback) => {
      if (!origin || origins.includes(origin) || origins.includes("*")) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
    credentials: true,
  };
}
