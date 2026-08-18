export const normalizeDomain = (domain: string): string => {
  return domain.trim().toLowerCase();
};

export const extractEmailDomain = (email: string): string => {
  const atIndex = email.lastIndexOf("@");

  if (atIndex === -1 || atIndex === email.length - 1) {
    return "";
  }

  return normalizeDomain(email.slice(atIndex + 1));
};

export const isEmailDomainAllowed = (email: string, allowedDomains: string[]): boolean => {
  if (allowedDomains.length === 0) {
    return true;
  }

  const normalizedDomains = new Set(allowedDomains.map(normalizeDomain));
  return normalizedDomains.has(extractEmailDomain(email));
};
