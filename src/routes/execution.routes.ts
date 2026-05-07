import { Router } from "express";
import ExecutionController from "../controllers/execution.controller.js";

const router = Router();

router.post("/run", (req, res) => ExecutionController.run(req, res));

export default router;
