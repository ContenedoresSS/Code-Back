import { ENV } from "./config/env.config.js";
import cors from "cors";
import type { CorsOptions } from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import v1Routes from "./routes/index-v1.routes.js";
import { payloadTooLargeErrorHandler } from "./middlewares/body-size-error.middleware.js";

const PORT = ENV.PORT;

const whiteList = ENV.corsOrigins;

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || whiteList.includes(origin) || whiteList.includes("*")) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
  credentials: true,
};

const app = express();
app.use(cors(corsOptions));
app.use(express.json({ limit: ENV.MAX_REQUEST_BODY }));

const healthLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

app.get("/api/health", healthLimiter, (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "unknown",
  });
});

app.use("/api/v1", v1Routes);

app.use(payloadTooLargeErrorHandler);

if (ENV.NODE_ENV === "development") {
  const { swaggerUiHandler, swaggerUiSetup, swaggerSpec } = await import("./config/swagger.js");
  app.get("/docs/openapi.json", (_req, res) => {
    res.json(swaggerSpec);
  });
  app.use("/docs", swaggerUiHandler, swaggerUiSetup);
}

export default app;

const main = async () => {
  if (ENV.NODE_ENV === "test") return;
  try {
    app.listen(PORT, () => {
      console.log(`API is runing in the port: ${PORT}`);
    });
  } catch (error) {
    console.error(`Start API error: ${error}`);
  }
};

main();
