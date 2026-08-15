import { Router } from "express";
import UserController from "../controllers/user.controller.js";
import UserAdminController from "../controllers/user-admin.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { rbac } from "../middlewares/rbac.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { updateUserSchema } from "../validators/user.validators.js";
import { UserRole } from "../types/enums/role.enum.js";

const router = Router();

router.get("/profile", authenticate, UserController.getProfile);
router.patch("/profile", authenticate, UserController.updateProfile);
router.patch("/password", authenticate, UserController.changePassword);

router.get("/", authenticate, rbac([UserRole.God]), UserAdminController.list);
router.patch(
  "/:id",
  authenticate,
  rbac([UserRole.God]),
  validate(updateUserSchema),
  UserAdminController.update
);

export default router;
