import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    appSetting: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock("../../src/config/prisma.js", () => ({
  default: mockPrisma,
}));

import settingService from "../../src/services/setting.service.js";

describe("SettingService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAllowedEmailDomains", () => {
    it("returns an empty array when no setting exists", async () => {
      mockPrisma.appSetting.findUnique.mockResolvedValue(null);

      const result = await settingService.getAllowedEmailDomains();

      expect(result).toEqual([]);
    });

    it("returns the stored domains when the setting exists", async () => {
      mockPrisma.appSetting.findUnique.mockResolvedValue({
        key: "allowedEmailDomains",
        value: ["uady.mx", "gmail.com"],
      });

      const result = await settingService.getAllowedEmailDomains();

      expect(result).toEqual(["uady.mx", "gmail.com"]);
    });

    it("returns an empty array when the stored value is not an array", async () => {
      mockPrisma.appSetting.findUnique.mockResolvedValue({
        key: "allowedEmailDomains",
        value: "not-an-array",
      });

      const result = await settingService.getAllowedEmailDomains();

      expect(result).toEqual([]);
    });
  });

  describe("setAllowedEmailDomains", () => {
    it("normalizes, dedupes and upserts the domains", async () => {
      mockPrisma.appSetting.upsert.mockResolvedValue({});

      const result = await settingService.setAllowedEmailDomains([
        " UADY.MX ",
        "uady.mx",
        "gmail.com",
      ]);

      expect(mockPrisma.appSetting.upsert).toHaveBeenCalledWith({
        where: { key: "allowedEmailDomains" },
        update: { value: ["uady.mx", "gmail.com"] },
        create: { key: "allowedEmailDomains", value: ["uady.mx", "gmail.com"] },
      });
      expect(result).toEqual(["uady.mx", "gmail.com"]);
    });

    it("persists an empty list", async () => {
      mockPrisma.appSetting.upsert.mockResolvedValue({});

      const result = await settingService.setAllowedEmailDomains([]);

      expect(mockPrisma.appSetting.upsert).toHaveBeenCalledWith({
        where: { key: "allowedEmailDomains" },
        update: { value: [] },
        create: { key: "allowedEmailDomains", value: [] },
      });
      expect(result).toEqual([]);
    });
  });
});
