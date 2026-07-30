import { describe, it, expect, beforeAll } from "vitest";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "test-secret-minimum-20-chars";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-min-20-chars";

import tokenService from "../../src/services/token.service.js";

describe("TokenService", () => {
  const testPayload = {
    sub: "user-123",
    role: "Student",
    name: "John",
  };

  describe("generateTokenPair", () => {
    it("generates valid access and refresh tokens", async () => {
      const tokenPair = await tokenService.generateTokenPair(testPayload);

      expect(tokenPair).toHaveProperty("accessToken");
      expect(tokenPair).toHaveProperty("refreshToken");
      expect(typeof tokenPair.accessToken).toBe("string");
      expect(typeof tokenPair.refreshToken).toBe("string");
    });

    it("access token contains correct payload", async () => {
      const tokenPair = await tokenService.generateTokenPair(testPayload);
      const decoded = jwt.decode(tokenPair.accessToken) as any;

      expect(decoded.sub).toBe("user-123");
      expect(decoded.role).toBe("Student");
      expect(decoded.name).toBe("John");
    });

    it("access token expires in 4 hours", async () => {
      const tokenPair = await tokenService.generateTokenPair(testPayload);
      const decoded = jwt.decode(tokenPair.accessToken) as any;

      const now = Math.floor(Date.now() / 1000);
      const expiresIn = decoded.exp - decoded.iat;

      expect(expiresIn).toBe(4 * 60 * 60);
    });

    it("refresh token contains only sub", async () => {
      const tokenPair = await tokenService.generateTokenPair(testPayload);
      const decoded = jwt.decode(tokenPair.refreshToken) as any;

      expect(decoded.sub).toBe("user-123");
      expect(decoded.role).toBeUndefined();
      expect(decoded.name).toBeUndefined();
    });

    it("refresh token expires in 7 days", async () => {
      const tokenPair = await tokenService.generateTokenPair(testPayload);
      const decoded = jwt.decode(tokenPair.refreshToken) as any;

      const expiresIn = decoded.exp - decoded.iat;

      expect(expiresIn).toBe(7 * 24 * 60 * 60);
    });
  });

  describe("verifyAccessToken", () => {
    it("verifies valid access token", async () => {
      const tokenPair = await tokenService.generateTokenPair(testPayload);
      const payload = tokenService.verifyAccessToken(tokenPair.accessToken);

      expect(payload.sub).toBe("user-123");
      expect(payload.role).toBe("Student");
      expect(payload.name).toBe("John");
    });

    it("throws error for invalid token", () => {
      expect(() => tokenService.verifyAccessToken("invalid-token")).toThrow(
        "Invalid or expired access token"
      );
    });

    it("throws error for expired token", async () => {
      const expiredToken = jwt.sign(testPayload, process.env.JWT_SECRET!, {
        expiresIn: "0s",
      });

      expect(() => tokenService.verifyAccessToken(expiredToken)).toThrow(
        "Invalid or expired access token"
      );
    });

    it("throws error for refresh token used as access token", async () => {
      const tokenPair = await tokenService.generateTokenPair(testPayload);

      expect(() => tokenService.verifyAccessToken(tokenPair.refreshToken)).toThrow();
    });
  });

  describe("verifyRefreshToken", () => {
    it("verifies valid refresh token", async () => {
      const tokenPair = await tokenService.generateTokenPair(testPayload);
      const payload = tokenService.verifyRefreshToken(tokenPair.refreshToken);

      expect(payload.sub).toBe("user-123");
    });

    it("throws error for invalid token", () => {
      expect(() => tokenService.verifyRefreshToken("invalid-token")).toThrow(
        "Invalid or expired refresh token"
      );
    });

    it("throws error for expired token", async () => {
      const expiredToken = jwt.sign(
        { sub: "user-123" },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: "0s" }
      );

      expect(() => tokenService.verifyRefreshToken(expiredToken)).toThrow(
        "Invalid or expired refresh token"
      );
    });

    it("throws error for access token used as refresh token", async () => {
      const tokenPair = await tokenService.generateTokenPair(testPayload);

      expect(() => tokenService.verifyRefreshToken(tokenPair.accessToken)).toThrow();
    });
  });
});
