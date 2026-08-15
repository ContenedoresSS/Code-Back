import type { Request, Response } from "express";
import type { RegisterUserRequest } from "../types/requests/register-user-request.model.js";
import authService from "../services/auth.service.js";
import { Prisma } from "@prisma/client"; // Importante para capturar los tipos de error
import type { LoginRequest } from "../types/requests/login-request.model.js";
import type { RefreshSessionRequest } from "../types/requests/refresh-session-request.model.js";
import type { ForgotPasswordRequest } from "../types/requests/forgot-password-request.model.js";
import type { VerifyResetCodeRequest } from "../types/requests/verify-reset-code-request.model.js";
import type { ResetPasswordRequest } from "../types/requests/reset-password-request.model.js";
import { MailProviderNotConfiguredError } from "../services/mail/mail-provider-not-configured.error.js";

class AuthController {
  async register(req: Request, res: Response) {
    try {
      const registerData: RegisterUserRequest = req.body;
      const user = await authService.register(registerData);

      return res.status(201).json({ user });
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          const target = (error.meta?.target as string[]) || [];
          return res.status(409).json({
            error: `El campo ${target.join(", ")} ya está en uso.`,
            code: "UNIQUE_CONSTRAINT_VIOLATION",
          });
        }
      }

      return res.status(400).json({
        error: error.message || "Error inesperado al registrar usuario",
      });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const loginData: LoginRequest = req.body;
      const result = await authService.login(loginData);

      return res.status(200).json(result);
    } catch (error: any) {
      if (error.message.includes("desactivada")) {
        return res.status(403).json({ error: error.message });
      }
      return res.status(401).json({
        error: error.message || "Login failed",
      });
    }
  }

  async refreshSession(req: Request, res: Response) {
    try {
      const data: RefreshSessionRequest = req.body;
      const result = await authService.refreshAccessToken(data.refreshToken);

      return res.status(200).json(result);
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes("desactivada")) {
        return res.status(403).json({ error: error.message });
      }
      return res.status(400).json({
        error: error instanceof Error ? error.message : "Refresh token failed",
      });
    }
  }

  async forgotPassword(req: Request, res: Response) {
    try {
      const data: ForgotPasswordRequest = req.body;
      await authService.forgotPassword(data);

      return res.status(200).json({
        message: "Si el correo existe, recibirás un código de recuperación.",
      });
    } catch (error: unknown) {
      if (error instanceof MailProviderNotConfiguredError) {
        return res.status(500).json({
          error: "Servicio de correo no configurado",
        });
      }

      return res.status(400).json({
        error: error instanceof Error ? error.message : "Error al enviar el código de recuperación",
      });
    }
  }

  async verifyResetCode(req: Request, res: Response) {
    try {
      const data: VerifyResetCodeRequest = req.body;
      const result = await authService.verifyResetCode(data);

      return res.status(200).json(result);
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : "Código inválido o expirado",
      });
    }
  }

  async resetPassword(req: Request, res: Response) {
    try {
      const data: ResetPasswordRequest = req.body;
      await authService.resetPassword(data);

      return res.status(200).json({
        message: "Contraseña actualizada correctamente.",
      });
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : "No se pudo restablecer la contraseña",
      });
    }
  }
}

export default new AuthController();
