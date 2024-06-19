import express, { Request, Response } from "express";
import supportedModelsHandler from "./handlers/SupportedModelsHandler";

const router = express.Router();

router.get("/supported-models", (_req: Request, res: Response) => {
  const response = supportedModelsHandler(res);

  res.status(response.statusCode).json(response);
  return;
});

export default router;