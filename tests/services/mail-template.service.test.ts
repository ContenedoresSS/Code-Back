import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MailTemplateService } from "../../src/services/mail/mail-template.service.js";

function createTemplateDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "mail-tpl-"));
  const tplDir = join(dir, "password-reset");
  mkdirSync(tplDir, { recursive: true });
  writeFileSync(join(tplDir, "subject.txt"), "Código de recuperación de contraseña\n");
  writeFileSync(
    join(tplDir, "body.txt"),
    "Tu código es {{CODE}} y expira en {{TTL_MINUTES}} minutos.\n"
  );
  writeFileSync(
    join(tplDir, "body.html"),
    "<p>Tu código es <b>{{CODE}}</b> ({{TTL_MINUTES}} min)</p>\n"
  );
  return dir;
}

describe("MailTemplateService", () => {
  let dir: string;

  beforeEach(() => {
    dir = createTemplateDir();
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("renders the HTML template replacing code and TTL placeholders", () => {
    const service = new MailTemplateService(dir);

    const result = service.renderPasswordReset({ code: "123456", ttlMinutes: 15 });

    expect(result.html).toContain("<b>123456</b>");
    expect(result.html).toContain("(15 min)");
  });

  it("renders the plain-text body replacing placeholders", () => {
    const service = new MailTemplateService(dir);

    const result = service.renderPasswordReset({ code: "123456", ttlMinutes: 15 });

    expect(result.text).toContain("Tu código es 123456 y expira en 15 minutos.");
  });

  it("reads the subject from subject.txt", () => {
    const service = new MailTemplateService(dir);

    const result = service.renderPasswordReset({ code: "123456", ttlMinutes: 15 });

    expect(result.subject).toBe("Código de recuperación de contraseña");
  });

  it("escapes HTML special characters in interpolated values", () => {
    const service = new MailTemplateService(dir);

    const result = service.renderPasswordReset({ code: "<b>&\"'", ttlMinutes: 15 });

    expect(result.html).toContain("&lt;b&gt;&amp;&quot;&#39;");
    expect(result.html).not.toContain("<b>&\"'");
  });

  it("throws at construction when a template file is missing", () => {
    rmSync(join(dir, "password-reset", "body.html"));

    expect(() => new MailTemplateService(dir)).toThrow();
  });
});
