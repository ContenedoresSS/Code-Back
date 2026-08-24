import { Router } from "express";
import { container } from "../config/container.js";
import { validate } from "../middlewares/validate.middleware.js";
import { updateEmailDomainsSchema } from "../validators/settings.validators.js";
import { UserRole } from "../types/enums/role.enum.js";

const { settingsController, authenticate, rbac } = container.cradle;

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
