import express, { Request, Response } from "express";
import { powerOffHandler } from "./PowerOffHandlers.js";
import { systemStatusMonitorHandlerAsync } from "./StatusMonitorHandlers.js";

const router = express.Router();

router.post("/power-off", (req: Request, res: Response) => {
  const response = powerOffHandler(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.get("/status", async (req: Request, res: Response) => {
  const response = await systemStatusMonitorHandlerAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

export default router;
