import { Router } from "express";
import { container } from "../config/container.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createSubjectSchema,
  updateSubjectSchema,
  duplicateSubjectSchema,
} from "../validators/subject.validators.js";
import { UserRole } from "../types/enums/role.enum.js";

const { subjectController, authenticate, rbac } = container.cradle;

const router = Router();

router.use(authenticate);
router.get("/", subjectController.getAll);
router.get("/:id", subjectController.getOne);
router.get("/:id/students", rbac([UserRole.Teacher]), subjectController.getStudents);
router.post(
  "/:id/duplicate",
  rbac([UserRole.Teacher]),
  validate(duplicateSubjectSchema),
  subjectController.duplicate
);
router.post("/", rbac([UserRole.Teacher]), validate(createSubjectSchema), subjectController.create);
router.put(
  "/:id",
  rbac([UserRole.Teacher]),
  validate(updateSubjectSchema),
  subjectController.update
);
router.delete("/:id", rbac([UserRole.Teacher]), subjectController.delete);

export default router;
