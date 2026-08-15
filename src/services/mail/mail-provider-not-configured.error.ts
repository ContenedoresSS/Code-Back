export class MailProviderNotConfiguredError extends Error {
  constructor() {
    super("No se ha configurado un proveedor de correo electrónico");
    this.name = "MailProviderNotConfiguredError";
  }
}
