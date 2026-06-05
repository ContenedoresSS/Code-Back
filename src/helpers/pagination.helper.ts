import type { Request } from "express";

export const getPaginationParams = (req: Request, defaultTake: number = 10) => {
  const skipParam = req.query.skip;
  const takeParam = req.query.take;

  const skipString = typeof skipParam === "string" ? skipParam : undefined;
  const takeString = typeof takeParam === "string" ? takeParam : undefined;

  const parsedSkip = skipString ? parseInt(skipString, 10) : 0;
  const parsedTake = takeString ? parseInt(takeString, 10) : defaultTake;

  return {
    skip: isNaN(parsedSkip) ? 0 : parsedSkip,
    take: isNaN(parsedTake) ? defaultTake : parsedTake,
  };
};
