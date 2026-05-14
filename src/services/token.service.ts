import type { TokenPair } from "../types/models/tokens/token-pair.model.js";
import type { TokenPayload } from "../types/models/tokens/token-payload.model.js";
import type { ITokenService } from "./interfaces/token-service.interface.js";
import jwt from "jsonwebtoken";
import { ENV } from "../config/env.config.js";

class TokenService implements ITokenService {
  async generateTokenPair(payload: TokenPayload): Promise<TokenPair> {
    const accessToken = jwt.sign(
      {
        sub: payload.sub,
        role: payload.role,
        name: payload.name,
      },
      ENV.JWT_SECRET,
      { expiresIn: "4h" }
    );

    const refreshToken = jwt.sign(
      {
        sub: payload.sub,
      },
      ENV.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, ENV.JWT_SECRET) as TokenPayload;
    } catch (error) {
      throw new Error("Invalid or expired access token");
    }
  }

  verifyRefreshToken(token: string): { sub: string } {
    try {
      return jwt.verify(token, ENV.JWT_REFRESH_SECRET) as { sub: string };
    } catch (error) {
      throw new Error("Invalid or expired refresh token");
    }
  }
}

export default new TokenService();
