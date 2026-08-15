import { z } from "zod";
import { UserRole } from "../types/enums/role.enum.js";

const ROLE_NAMES = Object.values(UserRole) as [UserRole, ...UserRole[]];

export const updateUserSchema = z
  .object({
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").optional(),
    isActive: z.boolean().optional(),
    role: z.enum(ROLE_NAMES).optional(),
  })
  .refine(
    (data) => data.password !== undefined || data.isActive !== undefined || data.role !== undefined,
    {
      message: "Debes enviar al menos un campo a actualizar",
    }
  );
