import { Resend } from "resend";
import type { IMailProvider, SendMailOptions } from "../interfaces/mail-provider.interface.js";

export class ResendMailProvider implements IMailProvider {
  private readonly client: Resend;
  private readonly from: string;

  constructor(apiKey: string, from: string) {
    this.client = new Resend(apiKey);
    this.from = from;
  }

  async send(options: SendMailOptions): Promise<void> {
    await this.client.emails.send({
      from: this.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      ...(options.text ? { text: options.text } : {}),
    });
  }
}
