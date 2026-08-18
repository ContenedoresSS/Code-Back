export class EmailDomainNotAllowedError extends Error {
  constructor(domain: string) {
    super(`El dominio del correo no está permitido: ${domain}`);
    this.name = "EmailDomainNotAllowedError";
  }
}
