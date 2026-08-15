import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type { IMailProvider, SendMailOptions } from "../interfaces/mail-provider.interface.js";

export interface SmtpConfig {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  secure: boolean;
}

export class SmtpMailProvider implements IMailProvider {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(config: SmtpConfig, from: string) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user && config.pass ? { user: config.user, pass: config.pass } : undefined,
    });
    this.from = from;
  }

  async send(options: SendMailOptions): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      ...(options.text ? { text: options.text } : {}),
    });
  }
}
