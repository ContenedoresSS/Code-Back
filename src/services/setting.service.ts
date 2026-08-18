import prisma from "../config/prisma.js";
import { normalizeDomain } from "../helpers/email-domain.helper.js";

const ALLOWED_EMAIL_DOMAINS_KEY = "allowedEmailDomains";

class SettingService {
  public async getAllowedEmailDomains(): Promise<string[]> {
    const record = await prisma.appSetting.findUnique({
      where: { key: ALLOWED_EMAIL_DOMAINS_KEY },
    });

    if (!record) {
      return [];
    }

    return this.parseDomains(record.value);
  }

  public async setAllowedEmailDomains(domains: string[]): Promise<string[]> {
    const normalized = [...new Set(domains.map(normalizeDomain))];

    await prisma.appSetting.upsert({
      where: { key: ALLOWED_EMAIL_DOMAINS_KEY },
      update: { value: normalized },
      create: { key: ALLOWED_EMAIL_DOMAINS_KEY, value: normalized },
    });

    return normalized;
  }

  private parseDomains(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.filter((item): item is string => typeof item === "string");
  }
}

export default new SettingService();
