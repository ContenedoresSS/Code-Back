import { ENV } from "./config/env.config.js";
import express from "express";
import v1Routes from "./routes/index-v1.routes.js";

const PORT = ENV.PORT;

const app = express();
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
