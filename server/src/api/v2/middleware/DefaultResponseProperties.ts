import { Request, Response, NextFunction } from "express";

function addDefaultProperties(_req: Request, res: Response, next: NextFunction) {
  res.locals["defaultProperties"] = {
    ...createDefaultProperties(),
  };
  next();
}

export function createDefaultProperties() {
  return {
    timestamp: new Date().toISOString(),
    requestId: crypto.randomUUID(),
  };
}

export default addDefaultProperties;
