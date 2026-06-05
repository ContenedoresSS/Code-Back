export const parseIdParam = (param: unknown, paramName: string = "ID"): number => {
  const rawValue = Array.isArray(param) ? param[0] : param;

  if (typeof rawValue !== "string" || rawValue.trim() === "") {
    throw new Error(`El ${paramName} proporcionado no es válido.`);
  }
  const parsedId = parseInt(rawValue, 10);

  if (isNaN(parsedId)) {
    throw new Error(`El ${paramName} proporcionado no es válido.`);
  }

  return parsedId;
};

export const parseStringParam = (param: unknown, paramName: string = "Parámetro"): string => {
  const rawValue = Array.isArray(param) ? param[0] : param;

  if (typeof rawValue !== "string" || rawValue.trim() === "") {
    throw new Error(`El ${paramName} proporcionado no es válido.`);
  }

  return rawValue.trim();
};
