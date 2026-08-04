import { ENV } from "./config/env.config.js";
import cors from "cors";
import type { CorsOptions } from "cors";
import express from "express";
import v1Routes from "./routes/index-v1.routes.js";

const PORT = ENV.PORT;

const whiteList = [
  "http://localhost:5173",
  "http://localhost:8080",
  "https://codepanel.orchfr.duckdns.org",
];

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || whiteList.includes(origin)) {
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
app.use(express.json());
app.use("/api/v1", v1Routes);

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
