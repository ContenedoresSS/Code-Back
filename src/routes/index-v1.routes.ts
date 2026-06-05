import { Router } from "express";
import authRoutes from "./auth.routes.js";
import invitationRoutes from "./invitations.routes.js";
import executionRoutes from "./execution.routes.js";
import programmingLanguageRoutes from "./programming-language.routes.js";
import userRoutes from "./user.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/invitation", invitationRoutes);
router.use("/execution", executionRoutes);
router.use("/programming-language", programmingLanguageRoutes);
router.use("/user", userRoutes);

export default router;
