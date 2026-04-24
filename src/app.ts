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

const main = async () => {
  try {
    app.listen(PORT, () => {
      console.log(`API is runing in the port: ${PORT}`);
    });
  } catch (error) {
    console.error(`Start API error: ${error}`);
  }
};

main();
