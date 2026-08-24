import { Router } from "express";
import { container } from "../config/container.js";
import { validate } from "../middlewares/validate.middleware.js";
import { updateUserSchema } from "../validators/user.validators.js";
import { UserRole } from "../types/enums/role.enum.js";

const { userController, userAdminController, authenticate, rbac } = container.cradle;

const router = Router();

router.get("/profile", authenticate, userController.getProfile);
router.patch("/profile", authenticate, userController.updateProfile);
router.patch("/password", authenticate, userController.changePassword);

router.get("/", authenticate, rbac([UserRole.God]), userAdminController.list);
router.patch(
  "/:id",
  authenticate,
  rbac([UserRole.God]),
  validate(updateUserSchema),
  userAdminController.update
);

export default router;
