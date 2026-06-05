import type { Prisma } from "@prisma/client";
import prisma from "../config/prisma.js";

class UserService {
  async create(data: any, tx?: any) {
    const db = tx || prisma;
    return await db.user.create({ data });
  }

  async findByAnyIdentifierAndRole(identifier: string) {
    try {
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ email: identifier }, { identifier: identifier }],
        },
        include: { role: true },
      });

      return user;
    } catch (error: any) {
      throw new Error("Invalid credentials");
    }
  }

  async findByIdWithRole(id: string) {
    try {
      const user = await prisma.user.findFirst({
        where: {
          id,
        },
        include: { role: true },
      });

      return user;
    } catch (error: any) {
      throw new Error("Invalid credentials");
    }
  }

  async getProfile(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        lastName: true,
        identifier: true,
        createdAt: true,
        role: true,
      },
    });

    if (!user) throw new Error("Usuario no encontrado");
    return user;
  }

  async updateProfile(
    id: string,
    data: Omit<
      Prisma.UserUpdateInput,
      "passwordHash" | "role" | "roleId" | "email" | "createdAt" | "id"
    >
  ) {
    return await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        lastName: true,
        identifier: true,
        createdAt: true,
      },
    });
  }

  async updatePassword(id: string, newPasswordHash: string) {
    return await prisma.user.update({
      where: { id },
      data: {
        passwordHash: newPasswordHash,
      },
      select: { id: true },
    });
  }

  async getPasswordHash(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { passwordHash: true },
    });
    if (!user) throw new Error("Usuario no encontrado");
    return user.passwordHash;
  }
}

export default new UserService();
