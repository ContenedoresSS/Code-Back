import { Router } from "express";
import { container } from "../config/container.js";
import { UserRole } from "../types/enums/role.enum.js";

const { authController, authenticate, rbac } = container.cradle;

const router = Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh", authController.refreshSession);
router.post("/forgot-password", authController.forgotPassword);
router.post("/verify-reset-code", authController.verifyResetCode);
router.post("/reset-password", authController.resetPassword);
router.get("/god-only", authenticate, rbac([]), (req, res) => {
  res.status(418).json({ message: "Not coffee, only tea" });
});

export default router;
