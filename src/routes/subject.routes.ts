import { Router } from "express";
import subjectController from "../controllers/subject.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { rbac } from "../middlewares/rbac.middleware.js";
import { UserRole } from "../types/enums/role.enum.js";

const router = Router();

router.use(authenticate);
router.post("/", rbac([UserRole.Teacher]), subjectController.create);
router.get("/", subjectController.getAll);
router.get("/:id", subjectController.getOne);
router.put("/:id", rbac([UserRole.Teacher]), subjectController.update);
router.delete("/:id", rbac([UserRole.Teacher]), subjectController.delete);

export default router;
