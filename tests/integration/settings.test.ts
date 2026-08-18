import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import settingService from "../../src/services/setting.service.js";
import { generateGodToken, generateTeacherToken, generateStudentToken } from "./helpers/tokens.js";

vi.mock("../../src/services/setting.service.js");

const mockedSettingService = vi.mocked(settingService);

describe("Integration: Settings Endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/settings/email-domains", () => {
    it("returns the allowed email domains for God role", async () => {
      mockedSettingService.getAllowedEmailDomains.mockResolvedValue(["uady.mx"]);

      const token = generateGodToken("god-1");
      const response = await request(app)
        .get("/api/v1/settings/email-domains")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ domains: ["uady.mx"] });
    });

    it("returns 403 for Teacher role", async () => {
      const token = generateTeacherToken();
      const response = await request(app)
        .get("/api/v1/settings/email-domains")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    it("returns 401 when no token provided", async () => {
      const response = await request(app).get("/api/v1/settings/email-domains");

      expect(response.status).toBe(401);
    });
  });

  describe("PUT /api/v1/settings/email-domains", () => {
    it("updates the allowed email domains for God role", async () => {
      mockedSettingService.setAllowedEmailDomains.mockResolvedValue(["uady.mx", "gmail.com"]);

      const token = generateGodToken("god-1");
      const response = await request(app)
        .put("/api/v1/settings/email-domains")
        .set("Authorization", `Bearer ${token}`)
        .send({ domains: ["uady.mx", "gmail.com"] });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ domains: ["uady.mx", "gmail.com"] });
      expect(mockedSettingService.setAllowedEmailDomains).toHaveBeenCalledWith([
        "uady.mx",
        "gmail.com",
      ]);
    });

    it("returns 400 for an invalid domains payload", async () => {
      const token = generateGodToken("god-1");
      const response = await request(app)
        .put("/api/v1/settings/email-domains")
        .set("Authorization", `Bearer ${token}`)
        .send({ domains: ["invalid domain"] });

      expect(response.status).toBe(400);
    });

    it("returns 403 for Student role", async () => {
      const token = generateStudentToken();
      const response = await request(app)
        .put("/api/v1/settings/email-domains")
        .set("Authorization", `Bearer ${token}`)
        .send({ domains: ["uady.mx"] });

      expect(response.status).toBe(403);
    });
  });
});
