import { Router } from "express";
import invitationController from "../controllers/invitation.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { rbac } from "../middlewares/rbac.middleware.js";
import { UserRole } from "../types/enums/role.enum.js";

const router = Router();

router.get("/", authenticate, rbac([UserRole.God]), invitationController.getAll);
router.post("/", authenticate, rbac([UserRole.God]), invitationController.create);
router.patch("/:id", authenticate, rbac([UserRole.God]), invitationController.update);
router.delete("/:id", authenticate, rbac([UserRole.God]), invitationController.delete);

export default router;
