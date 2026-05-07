import { Router } from "express";
import authRoutes from "./auth.routes.js";
import invitationRoutes from "./invitations.routes.js";
import executionRoutes from "./execution.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/invitation", invitationRoutes);
router.use("/execution", executionRoutes);

export default router;
