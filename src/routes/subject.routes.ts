import { Router } from "express";
import subjectController from "../controllers/subject.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { rbac } from "../middlewares/rbac.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createSubjectSchema, updateSubjectSchema } from "../validators/subject.validators.js";
import { UserRole } from "../types/enums/role.enum.js";

const router = Router();

router.use(authenticate);
router.get("/", subjectController.getAll);
router.get("/:id", subjectController.getOne);
router.get("/:id/students", rbac([UserRole.Teacher]), subjectController.getStudents);
router.post("/", rbac([UserRole.Teacher]), validate(createSubjectSchema), subjectController.create);
router.put(
  "/:id",
  rbac([UserRole.Teacher]),
  validate(updateSubjectSchema),
  subjectController.update
);
router.delete("/:id", rbac([UserRole.Teacher]), subjectController.delete);

export default router;
