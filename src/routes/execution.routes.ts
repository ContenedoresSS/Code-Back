import { Router } from "express";
import ExecutionController from "../controllers/execution.controller.js";
import { executionLimiter } from "../middlewares/rateLimiter.middleware.js";

const router = Router();

router.post("/run", executionLimiter, (req, res) => ExecutionController.run(req, res));
router.post("/run-with-files", executionLimiter, (req, res) =>
  ExecutionController.runWithFiles(req, res)
);

export default router;
