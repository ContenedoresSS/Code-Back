import { ENV } from "../../config/env.config.js";
import type { IMailProvider } from "../interfaces/mail-provider.interface.js";
import { ResendMailProvider } from "./resend-mail-provider.js";
import { SmtpMailProvider } from "./smtp-mail-provider.js";
import { MailProviderNotConfiguredError } from "./mail-provider-not-configured.error.js";

class MailProviderFactory {
  create(): IMailProvider {
    if (ENV.EMAIL_PROVIDER === "none") {
      throw new MailProviderNotConfiguredError();
    }

    if (ENV.EMAIL_PROVIDER === "resend") {
      if (!ENV.RESEND_API_KEY) {
        throw new Error("RESEND_API_KEY is required when EMAIL_PROVIDER is 'resend'");
      }
      return new ResendMailProvider(ENV.RESEND_API_KEY, ENV.EMAIL_FROM);
    }

    return new SmtpMailProvider(
      {
        host: ENV.SMTP_HOST,
        port: ENV.SMTP_PORT,
        ...(ENV.SMTP_USER ? { user: ENV.SMTP_USER } : {}),
        ...(ENV.SMTP_PASS ? { pass: ENV.SMTP_PASS } : {}),
        secure: ENV.SMTP_SECURE,
      },
      ENV.EMAIL_FROM
    );
  }
}

if (ENV.EMAIL_PROVIDER === "none" && ENV.NODE_ENV !== "test") {
  console.warn(
    "[Mail] No se ha configurado un proveedor de correo. El backend se ejecuta SIN envío de correo: " +
      "los endpoints de recuperación de contraseña devolverán 500. Configura EMAIL_PROVIDER en tu .env " +
      "(resend o smtp) para habilitarlos."
  );
}

export default new MailProviderFactory();
