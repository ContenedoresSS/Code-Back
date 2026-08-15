import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ENV } from "../../config/env.config.js";

export interface RenderedMail {
  subject: string;
  text: string;
  html: string;
}

export interface PasswordResetTemplateVars {
  code: string;
  ttlMinutes: number;
}

const DEFAULT_TEMPLATES_DIR = fileURLToPath(new URL("../../../templates/mail/", import.meta.url));

export class MailTemplateService {
  private readonly subject: string;
  private readonly text: string;
  private readonly html: string;

  constructor(templateDir: string) {
    this.subject = readFileSync(join(templateDir, "password-reset", "subject.txt"), "utf8");
    this.text = readFileSync(join(templateDir, "password-reset", "body.txt"), "utf8");
    this.html = readFileSync(join(templateDir, "password-reset", "body.html"), "utf8");
  }

  renderPasswordReset(vars: PasswordResetTemplateVars): RenderedMail {
    const ttlMinutes = String(vars.ttlMinutes);

    return {
      subject: this.subject.trim(),
      text: this.text.replaceAll("{{CODE}}", vars.code).replaceAll("{{TTL_MINUTES}}", ttlMinutes),
      html: this.html
        .replaceAll("{{CODE}}", escapeHtml(vars.code))
        .replaceAll("{{TTL_MINUTES}}", ttlMinutes),
    };
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const templateDir = ENV.MAIL_TEMPLATES_DIR ?? DEFAULT_TEMPLATES_DIR;

export default new MailTemplateService(templateDir);
