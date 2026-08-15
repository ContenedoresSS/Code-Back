import { Router } from "express";
import authController from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { rbac } from "../middlewares/rbac.middleware.js";
import { UserRole } from "../types/enums/role.enum.js";

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
