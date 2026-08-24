import { Router } from "express";
import { container } from "../config/container.js";
import { executionLimiter } from "../middlewares/rateLimiter.middleware.js";

const { executionController } = container.cradle;

const router = Router();

router.post("/run", executionLimiter, (req, res) => executionController.run(req, res));
router.post("/run-with-files", executionLimiter, (req, res) =>
  executionController.runWithFiles(req, res)
);

export default router;
