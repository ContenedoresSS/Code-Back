import { z } from "zod";

const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i;

export const updateEmailDomainsSchema = z.object({
  domains: z.array(z.string().trim().regex(domainRegex, "Dominio de correo inválido")),
});
