export const parseIdParam = (param: unknown, paramName: string = "ID"): number => {
  // 1. Extraemos el valor si Express lo mandó como un array (ej. ?id[]=1)
  const rawValue = Array.isArray(param) ? param[0] : param;

  // 2. Validamos que lo que quede sea efectivamente un string no vacío
  if (typeof rawValue !== "string" || rawValue.trim() === "") {
    throw new Error(`El ${paramName} proporcionado no es válido.`);
  }

  // 3. Parseamos de forma segura
  const parsedId = parseInt(rawValue, 10);

  if (isNaN(parsedId)) {
    throw new Error(`El ${paramName} proporcionado no es válido.`);
  }

  return parsedId;
};
