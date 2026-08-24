import { Router } from "express";
import { container } from "../config/container.js";

const { programmingLanguageController, authenticate, rbac } = container.cradle;

const router = Router();

router.get("/", programmingLanguageController.getAll);

router.get("/:id", programmingLanguageController.getById);
router.post("/", authenticate, rbac([]), programmingLanguageController.create);
router.put("/:id", authenticate, rbac([]), programmingLanguageController.update);
router.delete("/:id", authenticate, rbac([]), programmingLanguageController.delete);

export default router;
