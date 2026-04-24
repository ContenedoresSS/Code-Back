import { Router } from "express";
import authRoutes from "./auth.routes.js";
import invitationRoutes from "./invitations.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/invitation", invitationRoutes);

export default router;
