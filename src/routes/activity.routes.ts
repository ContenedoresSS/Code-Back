import { Router } from "express";
import activityController from "../controllers/activity.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { rbac } from "../middlewares/rbac.middleware.js";
import { UserRole } from "../types/enums/role.enum.js";
import testCaseController from "../controllers/test-case.controller.js";

const router = Router();

router.use(authenticate);
router.use(rbac([UserRole.Teacher]));
router.post("/", activityController.create);
router.get("/", activityController.getAll);
router.get("/:id", activityController.getOne);
router.put("/:id", activityController.update);
router.delete("/:id", activityController.delete);

//Test cases routes
router.get("/:id/test-case", testCaseController.getAll);
router.post("/:id/test-case", testCaseController.create);
router.put("/:id/test-case/:testCaseId", testCaseController.update);
router.delete("/:id/test-case/:testCaseId", testCaseController.delete);

export default router;
