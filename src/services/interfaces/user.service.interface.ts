import type { Prisma, User } from "@prisma/client";
import type { UpdateUserRequest } from "../../types/requests/update-user-request.model.js";
import type { UserListItemResponse } from "../../types/responses/user-list-item-response.model.js";
import type { PaginationData } from "../../types/shared/pagination-data.shared.js";

type UserWithRole = Prisma.UserGetPayload<{ include: { role: true } }>;
type CreatedUser = User & { username?: string };
type ProfileSelect = {
  id: true;
  email: true;
  name: true;
  lastName: true;
  identifier: true;
  createdAt: true;
};
type EmailLookup = {
  id: true;
  email: true;
  name: true;
  resetTokenHash: true;
  resetTokenExpires: true;
};

export interface IUserService {
  create(
    data: Prisma.UserUncheckedCreateInput,
    tx?: Prisma.TransactionClient
  ): Promise<CreatedUser>;
  findByAnyIdentifierAndRole(identifier: string): Promise<UserWithRole | null>;
  findByIdWithRole(id: string): Promise<UserWithRole | null>;
  getProfile(id: string): Promise<Prisma.UserGetPayload<{ select: ProfileSelect }>>;
  updateProfile(
    id: string,
    data: Omit<
      Prisma.UserUpdateInput,
      "passwordHash" | "role" | "roleId" | "email" | "createdAt" | "id"
    >
  ): Promise<Prisma.UserGetPayload<{ select: ProfileSelect }>>;
  updatePassword(id: string, newPasswordHash: string): Promise<{ id: string }>;
  getPasswordHash(id: string): Promise<string>;
  findByEmail(email: string): Promise<Prisma.UserGetPayload<{ select: EmailLookup }> | null>;
  saveResetCode(id: string, codeHash: string, expiresAt: Date): Promise<{ id: string }>;
  clearResetCode(id: string): Promise<{ id: string }>;
  listUsers(
    roleName: string | undefined,
    search: string | undefined,
    skip: number,
    take: number
  ): Promise<PaginationData<UserListItemResponse>>;
  updateUserByAdmin(id: string, data: UpdateUserRequest): Promise<UserListItemResponse>;
}
