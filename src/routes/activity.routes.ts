import { Router } from "express";
import activityController from "../controllers/activity.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { rbac } from "../middlewares/rbac.middleware.js";
import { UserRole } from "../types/enums/role.enum.js";

const router = Router();

router.use(authenticate);
router.use(rbac([UserRole.Teacher]));
router.post("/", activityController.create);
router.get("/", activityController.getAll);
router.get("/:id", activityController.getOne);
router.put("/:id", activityController.update);
router.delete("/:id", activityController.delete);

export default router;
