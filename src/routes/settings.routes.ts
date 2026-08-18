import { Router } from "express";
import settingsController from "../controllers/settings.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { rbac } from "../middlewares/rbac.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { updateEmailDomainsSchema } from "../validators/settings.validators.js";
import { UserRole } from "../types/enums/role.enum.js";

const router = Router();

router.get(
  "/email-domains",
  authenticate,
  rbac([UserRole.God]),
  settingsController.getEmailDomains
);
router.put(
  "/email-domains",
  authenticate,
  rbac([UserRole.God]),
  validate(updateEmailDomainsSchema),
  settingsController.updateEmailDomains
);

export default router;
