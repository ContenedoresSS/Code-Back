import bcrypt from "bcrypt";
import { randomInt } from "node:crypto";
import prisma from "../config/prisma.js";
import type { RegisterUserRequest } from "../types/requests/register-user-request.model.js";
import type { RegisterUserReponse } from "../types/responses/register-user-response.model.js";
import type { LoginRequest } from "../types/requests/login-request.model.js";
import type { LoginResponse } from "../types/responses/login-response.model.js";
import type { ForgotPasswordRequest } from "../types/requests/forgot-password-request.model.js";
import type { VerifyResetCodeRequest } from "../types/requests/verify-reset-code-request.model.js";
import type { VerifyResetCodeResponse } from "../types/responses/verify-reset-code-response.model.js";
import type { ResetPasswordRequest } from "../types/requests/reset-password-request.model.js";
import type { IUserService } from "./interfaces/user.service.interface.js";
import type { ITokenService } from "./interfaces/token-service.interface.js";
import type { IInvitationService } from "./interfaces/invitation.service.interface.js";
import type { IMailProvider } from "./interfaces/mail-provider.interface.js";
import type { PasswordResetTemplateVars, RenderedMail } from "./mail/mail-template.service.js";
import type { ISettingService } from "./interfaces/setting.service.interface.js";
import type { IAuthService } from "./interfaces/auth.service.interface.js";
import type { TokenPayload } from "../types/models/tokens/token-payload.model.js";
import { EmailDomainNotAllowedError } from "./mail/email-domain-not-allowed.error.js";
import { extractEmailDomain, isEmailDomainAllowed } from "../helpers/email-domain.helper.js";
import { ENV } from "../config/env.config.js";

type MailProviderFactoryLike = { create(): IMailProvider };
type MailTemplateServiceLike = {
  renderPasswordReset(vars: PasswordResetTemplateVars): RenderedMail;
};

export class AuthService implements IAuthService {
  readonly SALT_ROUNDS: number = 10;

  constructor(
    private readonly userService: IUserService,
    private readonly tokenService: ITokenService,
    private readonly invitationService: IInvitationService,
    private readonly mailProviderFactory: MailProviderFactoryLike,
    private readonly mailTemplateService: MailTemplateServiceLike,
    private readonly settingService: ISettingService
  ) {}

  public async register(data: RegisterUserRequest): Promise<RegisterUserReponse> {
    const allowedDomains = await this.settingService.getAllowedEmailDomains();

    if (!isEmailDomainAllowed(data.email, allowedDomains)) {
      throw new EmailDomainNotAllowedError(extractEmailDomain(data.email));
    }

    const { roleId, roleName } = await this.resolveRoleAssigment(data.invitationCode);

    const hashedPassword = await bcrypt.hash(data.password, this.SALT_ROUNDS);

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await this.userService.create(
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
        await this.invitationService.validateAndConsume(data.invitationCode, tx);
      }

      return user;
    });

    return {
      id: newUser.id,
      ...(newUser.username !== undefined ? { username: newUser.username } : {}),
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
    const user = await this.userService.findByAnyIdentifierAndRole(data.identifier);

    if (!user) {
      throw new Error("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    }

    if (!user.isActive) {
      throw new Error("La cuenta está desactivada.");
    }

    const pairTokens = await this.tokenService.generateTokenPair({
      sub: user.id,
      role: user.role.name,
      name: user.name,
    } as TokenPayload);

    return {
      token: pairTokens.accessToken,
      refreshToken: pairTokens.refreshToken,
    } as LoginResponse;
  }

  public async refreshAccessToken(refreshToken: string): Promise<LoginResponse> {
    const decoded = this.tokenService.verifyRefreshToken(refreshToken);
    const user = await this.userService.findByIdWithRole(decoded.sub);

    if (!user) {
      throw new Error("User not found");
    }

    if (!user.isActive) {
      throw new Error("La cuenta está desactivada.");
    }

    const tokenPair = await this.tokenService.generateTokenPair({
      sub: user.id,
      role: user.role.name,
      name: user.name,
    });

    return {
      token: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
    } as LoginResponse;
  }

  public async forgotPassword(data: ForgotPasswordRequest): Promise<void> {
    const provider = this.mailProviderFactory.create();

    const user = await this.userService.findByEmail(data.email);

    if (!user) {
      return;
    }

    const code = this.generateResetCode();
    const codeHash = await bcrypt.hash(code, this.SALT_ROUNDS);
    const expiresAt = new Date(Date.now() + ENV.RESET_CODE_TTL_MINUTES * 60_000);

    await this.userService.saveResetCode(user.id, codeHash, expiresAt);

    const rendered = this.mailTemplateService.renderPasswordReset({
      code,
      ttlMinutes: ENV.RESET_CODE_TTL_MINUTES,
    });

    await provider.send({
      to: user.email,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
    });
  }

  public async verifyResetCode(data: VerifyResetCodeRequest): Promise<VerifyResetCodeResponse> {
    const user = await this.userService.findByEmail(data.email);

    if (!user || !user.resetTokenHash || !user.resetTokenExpires) {
      throw new Error("Invalid or expired reset code");
    }

    if (user.resetTokenExpires.getTime() < Date.now()) {
      throw new Error("Invalid or expired reset code");
    }

    const isValid = await bcrypt.compare(data.code, user.resetTokenHash);
    if (!isValid) {
      throw new Error("Invalid or expired reset code");
    }

    const resetToken = this.tokenService.generateResetToken(user.id);
    return { resetToken };
  }

  public async resetPassword(data: ResetPasswordRequest): Promise<void> {
    const userId = this.tokenService.verifyResetToken(data.resetToken);

    const hashedPassword = await bcrypt.hash(data.newPassword, this.SALT_ROUNDS);
    await this.userService.updatePassword(userId, hashedPassword);
    await this.userService.clearResetCode(userId);
  }

  private generateResetCode(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, "0");
  }
}
