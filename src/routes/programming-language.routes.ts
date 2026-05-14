import { Router } from "express";
import ProgrammingLanguageController from "../controllers/programming-language.controller.js";
import { rbac } from "../middlewares/rbac.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", ProgrammingLanguageController.getAll);

router.get("/:id", ProgrammingLanguageController.getById);
router.post("/", authenticate, rbac([]), ProgrammingLanguageController.create);
router.put("/:id", authenticate, rbac([]), ProgrammingLanguageController.update);
router.delete("/:id", authenticate, rbac([]), ProgrammingLanguageController.delete);

export default router;
