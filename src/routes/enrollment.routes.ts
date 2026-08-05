import { Router } from "express";
import enrollmentController from "../controllers/enrollment.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { rbac } from "../middlewares/rbac.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createEnrollmentSchema } from "../validators/enrollment.validators.js";
import { UserRole } from "../types/enums/role.enum.js";

const router = Router();

router.use(authenticate);
router.get("/", enrollmentController.getAll);
router.post(
  "/",
  rbac([UserRole.Student]),
  validate(createEnrollmentSchema),
  enrollmentController.enroll
);
router.delete("/:id", enrollmentController.delete);

export default router;
