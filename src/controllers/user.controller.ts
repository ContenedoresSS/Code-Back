import type { Request, Response } from "express";
import type { IUserService } from "../services/interfaces/user.service.interface.js";
import type { UpdateProfileRequest } from "../types/requests/update-profile-request.model.js";
import type { ChangePasswordRequest } from "../types/requests/change-password-request.model.js";
import bcrypt from "bcrypt";

export class UserController {
  constructor(private readonly userService: IUserService) {}

  public getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user;

      if (!userId) {
        res.status(400).json({ error: "ID de usuario requerido" });
        return;
      }

      const profile = await this.userService.getProfile(userId);

      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error: any) {
      res.status(404).json({ success: false, error: error.message });
    }
  };

  public updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user;
      const body = req.body as UpdateProfileRequest;

      if (!userId) {
        res.status(400).json({ error: "ID de usuario requerido" });
        return;
      }

      const updateData = Object.fromEntries(
        Object.entries(body).filter(([_, v]) => v !== undefined)
      );

      const updatedProfile = await this.userService.updateProfile(userId, updateData);

      res.status(200).json({
        success: true,
        message: "Perfil actualizado correctamente",
        data: updatedProfile,
      });
    } catch (error: any) {
      if (error.code === "P2002") {
        res
          .status(409)
          .json({ success: false, error: "El identificador proporcionado ya está en uso." });
        return;
      }
      res.status(500).json({ success: false, error: "Error al actualizar el perfil" });
    }
  };

  public changePassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user;
      const { currentPassword, newPassword } = req.body as ChangePasswordRequest;

      if (!userId || !currentPassword || !newPassword) {
        res.status(400).json({ error: "Faltan parámetros obligatorios" });
        return;
      }

      const currentHash = await this.userService.getPasswordHash(userId);

      const isPasswordValid = await bcrypt.compare(currentPassword, currentHash);
      if (!isPasswordValid) {
        res.status(401).json({ success: false, error: "La contraseña actual es incorrecta" });
        return;
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      await this.userService.updatePassword(userId, newHash);

      res.status(200).json({
        success: true,
        message: "Contraseña actualizada correctamente",
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: "Error interno al cambiar la contraseña" });
    }
  };
}
