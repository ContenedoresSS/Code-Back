import type { TokenPair } from "../../types/models/tokens/token-pair.model.js";
import type { TokenPayload } from "../../types/models/tokens/token-payload.model.js";

export interface ITokenService {
  generateTokenPair(payload: TokenPayload): Promise<TokenPair>;
  verifyAccessToken(token: string): TokenPayload;
  verifyRefreshToken(token: string): { sub: string };
  generateResetToken(sub: string): string;
  verifyResetToken(token: string): string;
}
