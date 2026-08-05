import { Router } from "express";
import activityController from "../controllers/activity.controller.js";
import { authenticate, optionalAuthenticate } from "../middlewares/auth.middleware.js";
import { rbac } from "../middlewares/rbac.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createActivitySchema, updateActivitySchema } from "../validators/activity.validators.js";
import { UserRole } from "../types/enums/role.enum.js";
import testCaseController from "../controllers/test-case.controller.js";
import submissionController from "../controllers/submission.controller.js";

const router = Router();

// Public routes
router.get("/:id/workspace", activityController.getWorkspace);
router.post("/:id/submit", optionalAuthenticate, submissionController.submit);

//Protected routes
router.use(authenticate);
router.use(rbac([UserRole.Teacher]));
router.post("/", validate(createActivitySchema), activityController.create);
router.get("/", activityController.getAll);
router.get("/:id", activityController.getOne);
router.put("/:id", validate(updateActivitySchema), activityController.update);
router.delete("/:id", activityController.delete);

//Test cases routes
router.get("/:id/test-case", testCaseController.getAll);
router.post("/:id/test-case", testCaseController.create);
router.put("/:id/test-case/:testCaseId", testCaseController.update);
router.delete("/:id/test-case/:testCaseId", testCaseController.delete);

export default router;
