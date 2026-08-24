import type { Request, Response, NextFunction } from "express";
import type { ITokenService } from "../services/interfaces/token-service.interface.js";
import { UserRole } from "../types/enums/role.enum.js";

export const createAuthenticate = (tokenService: ITokenService) => {
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
      req.user = payload.sub;

      if (isUserRole(payload.role)) {
        req.role = payload.role;
      } else {
        throw new Error("Invalid user role");
      }

      next();
    } catch (error) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  };
};

export const createOptionalAuthenticate = (tokenService: ITokenService) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.split(" ")[1];

    try {
      if (!token) {
        return res.status(401).json({ message: "No token provided or invalid format" });
      }

      const payload = tokenService.verifyAccessToken(token);
      req.user = payload.sub;

      if (isUserRole(payload.role)) {
        req.role = payload.role;
      }
    } catch (error) {}

    next();
  };
};

const isUserRole = (role: string): role is UserRole => {
  return Object.values(UserRole).includes(role as UserRole);
};
