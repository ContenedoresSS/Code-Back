import type { UserRole } from "../enums/role.enum.ts";

export {};

declare global {
  namespace Express {
    interface Request {
      role?: UserRole;
      user?: string;
    }
  }
}
