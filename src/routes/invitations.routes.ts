import { Router } from "express";
import { container } from "../config/container.js";
import { UserRole } from "../types/enums/role.enum.js";

const { invitationController, authenticate, rbac } = container.cradle;

const router = Router();

router.get("/", authenticate, rbac([UserRole.God]), invitationController.getAll);
router.post("/", authenticate, rbac([UserRole.God]), invitationController.create);
router.patch("/:id", authenticate, rbac([UserRole.God]), invitationController.update);
router.delete("/:id", authenticate, rbac([UserRole.God]), invitationController.delete);

export default router;
