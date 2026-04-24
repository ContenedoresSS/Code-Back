import type { Request, Response, NextFunction } from "express";
import tokenService from "../services/token.service.js";
import { UserRole } from "../types/enums/role.enum.js";

export const rbac = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided or invalid format" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "No token provided or invalid format" });
    }

    try {
      const payload = tokenService.verifyAccessToken(token);

      if (!isUserRole(payload.role)) {
        throw new Error("Invalid user role");
      }

      if (payload.role == UserRole.God) {
        next();
        return;
      }

      if (!allowedRoles.includes(payload.role)) {
        return res.status(403).json({ message: "You do not have permission for this action" });
      }
      next();
    } catch (error) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  };
};

const isUserRole = (role: string): role is UserRole => {
  return Object.values(UserRole).includes(role as UserRole);
};
