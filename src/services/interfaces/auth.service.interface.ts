import type { RegisterUserRequest } from "../../types/requests/register-user-request.model.js";
import type { RegisterUserReponse } from "../../types/responses/register-user-response.model.js";
import type { LoginRequest } from "../../types/requests/login-request.model.js";
import type { LoginResponse } from "../../types/responses/login-response.model.js";
import type { ForgotPasswordRequest } from "../../types/requests/forgot-password-request.model.js";
import type { VerifyResetCodeRequest } from "../../types/requests/verify-reset-code-request.model.js";
import type { VerifyResetCodeResponse } from "../../types/responses/verify-reset-code-response.model.js";
import type { ResetPasswordRequest } from "../../types/requests/reset-password-request.model.js";
import type { RefreshSessionRequest } from "../../types/requests/refresh-session-request.model.js";

export interface IAuthService {
  register(data: RegisterUserRequest): Promise<RegisterUserReponse>;
  login(data: LoginRequest): Promise<LoginResponse>;
  refreshAccessToken(refreshToken: string): Promise<LoginResponse>;
  forgotPassword(data: ForgotPasswordRequest): Promise<void>;
  verifyResetCode(data: VerifyResetCodeRequest): Promise<VerifyResetCodeResponse>;
  resetPassword(data: ResetPasswordRequest): Promise<void>;
}
