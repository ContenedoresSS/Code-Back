import { Router } from "express";
import authRoutes from "./auth.routes.js";
import invitationRoutes from "./invitations.routes.js";
import executionRoutes from "./execution.routes.js";
import programmingLanguageRoutes from "./programming-language.routes.js";
import userRoutes from "./user.routes.js";
import subjetRoutes from "./subject.routes.js";
import activityRoutes from "./activity.routes.js";
import enrollmentRoutes from "./enrollment.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/invitation", invitationRoutes);
router.use("/execution", executionRoutes);
router.use("/programming-language", programmingLanguageRoutes);
router.use("/user", userRoutes);
router.use("/subject", subjetRoutes);
router.use("/activity", activityRoutes);
router.use("/enrollment", enrollmentRoutes);

export default router;
