import { Router, Request, Response } from "express";
import * as SettingsHandlers from "./handlers/SettingsHandlers";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  const result = await SettingsHandlers.getSettingsAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

router.patch("/", async (req: Request, res: Response) => {
  const result = await SettingsHandlers.updateSettingsAsync(req, res);
  res.status(result.statusCode).json(result);
  return;
});

export default router;
