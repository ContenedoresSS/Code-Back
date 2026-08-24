import type { Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import prisma from "../config/prisma.js";
import type { UpdateUserRequest } from "../types/requests/update-user-request.model.js";
import type { UserListItemResponse } from "../types/responses/user-list-item-response.model.js";
import type { PaginationData } from "../types/shared/pagination-data.shared.js";
import { UserRole } from "../types/enums/role.enum.js";
import type { IUserService } from "./interfaces/user.service.interface.js";

const userListItemSelect = {
  id: true,
  email: true,
  name: true,
  lastName: true,
  identifier: true,
  isActive: true,
  createdAt: true,
  role: { select: { id: true, name: true } },
} as const satisfies Prisma.UserSelect;

const toListItem = (user: Prisma.UserGetPayload<{ select: typeof userListItemSelect }>) => ({
  ...user,
  createdAt: user.createdAt.toISOString(),
});

export class UserService implements IUserService {
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

  async findByEmail(email: string) {
    return await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        resetTokenHash: true,
        resetTokenExpires: true,
      },
    });
  }

  async saveResetCode(id: string, codeHash: string, expiresAt: Date) {
    return await prisma.user.update({
      where: { id },
      data: {
        resetTokenHash: codeHash,
        resetTokenExpires: expiresAt,
      },
      select: { id: true },
    });
  }

  async clearResetCode(id: string) {
    return await prisma.user.update({
      where: { id },
      data: {
        resetTokenHash: null,
        resetTokenExpires: null,
      },
      select: { id: true },
    });
  }

  async listUsers(
    roleName: string | undefined,
    search: string | undefined,
    skip: number = 0,
    take: number = 10
  ): Promise<PaginationData<UserListItemResponse>> {
    const where: Prisma.UserWhereInput = {
      ...(roleName ? { role: { name: roleName } } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [users, totalCount] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        select: userListItemSelect,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: users.map(toListItem),
      totalCount,
    };
  }

  async updateUserByAdmin(id: string, data: UpdateUserRequest): Promise<UserListItemResponse> {
    return prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({ where: { id }, include: { role: true } });

      if (!target) {
        throw new Error("Usuario no encontrado");
      }

      const losesAdminStatus =
        target.role.name === UserRole.God &&
        target.isActive &&
        (data.isActive === false || (data.role !== undefined && data.role !== UserRole.God));

      if (losesAdminStatus) {
        const activeAdmins = await tx.$queryRaw<{ id: string }[]>`
          SELECT u.id
          FROM users u
          INNER JOIN roles r ON u.role_id = r.id
          WHERE r.name = ${UserRole.God} AND u.is_active = true
          FOR UPDATE
        `;

        if (activeAdmins.length <= 1) {
          throw new Error("No se puede desactivar o degradar al último administrador activo.");
        }
      }

      const updateData: Prisma.UserUpdateInput = {};

      if (data.password !== undefined) {
        updateData.passwordHash = await bcrypt.hash(data.password, 10);
      }

      if (data.isActive !== undefined) {
        updateData.isActive = data.isActive;
      }

      if (data.role !== undefined) {
        const role = await tx.role.findUnique({ where: { name: data.role } });

        if (!role) {
          throw new Error("El rol no existe.");
        }

        updateData.role = { connect: { id: role.id } };
      }

      const updated = await tx.user.update({
        where: { id },
        data: updateData,
        select: userListItemSelect,
      });

      return toListItem(updated);
    });
  }
}
