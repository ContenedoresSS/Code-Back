import bcrypt from "bcrypt";
import prisma from "../config/prisma.js";
import type { RegisterUserRequest } from "../types/requests/register-user-request.model.js";
import type { RegisterUserReponse } from "../types/responses/register-user-response.model.js";
import type { LoginRequest } from "../types/requests/login-request.model.js";
import type { LoginResponse } from "../types/responses/login-response.model.js";
import userService from "./user.service.js";
import tokenService from "./token.service.js";
import type { TokenPayload } from "../types/models/tokens/token-payload.model.js";
import invitationService from "./invitation.service.js";

class AuthService {
  readonly SALT_ROUNDS: number = 10;

  public async register(data: RegisterUserRequest): Promise<RegisterUserReponse> {
    const { roleId, roleName } = await this.resolveRoleAssigment(data.invitationCode);

    const hashedPassword = await bcrypt.hash(data.password, this.SALT_ROUNDS);

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await userService.create(
        {
          email: data.email,
          passwordHash: hashedPassword,
          name: data.name,
          lastName: data.lastName,
          identifier: data.identifier ?? "",
          roleId: roleId,
        },
        tx
      );

      if (data.invitationCode) {
        await invitationService.validateAndConsume(data.invitationCode, tx);
      }

      return user;
    });

    return {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      name: newUser.name,
      lastName: newUser.lastName,
      role: roleName,
    };
  }

  private async resolveRoleAssigment(code?: string): Promise<{ roleId: number; roleName: string }> {
    if (code) {
      const invite = await prisma.invitationCode.findUnique({
        where: { code },
        include: { role: true },
      });

      if (!invite || invite.isUsed) {
        throw new Error("Invitation code is invalid or already used");
      }

      if (!invite.role) {
        throw new Error("Role associated with invitation does not exist");
      }

      return { roleId: invite.roleId, roleName: invite.role.name };
    }

    const studentRole = await prisma.role.findUnique({
      where: { name: "Student" },
    });
    if (!studentRole) throw new Error("Default role not found");
    return { roleId: studentRole.id, roleName: studentRole.name };
  }

  private async consumeInvitation(code: string, tx: any) {
    await tx.invitationCode.update({
      where: { code },
      data: { isUsed: true },
    });
  }

  public async login(data: LoginRequest): Promise<LoginResponse> {
    const user = await userService.findByAnyIdentifierAndRole(data.identifier);

    if (!user) {
      throw new Error("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    }

    const pairTokens = await tokenService.generateTokenPair({
      sub: user.id,
      role: user.role.name,
    } as TokenPayload);

    return {
      token: pairTokens.accessToken,
      refreshToken: pairTokens.refreshToken,
    } as LoginResponse;
  }

  public async refreshAccessToken(refreshToken: string): Promise<LoginResponse> {
    const decoded = tokenService.verifyRefreshToken(refreshToken);
    const user = await userService.findByIdWithRole(decoded.sub);

    if (!user) {
      throw new Error("User not found");
    }

    const tokenPair = await tokenService.generateTokenPair({
      sub: user.id,
      role: user.role.name,
    });

    return {
      token: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
    } as LoginResponse;
  }
}

export default new AuthService();
