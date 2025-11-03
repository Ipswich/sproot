import express, { Request, Response } from "express";
import { powerOffHandler } from "./PowerOffHandlers";
import { systemStatusMonitorHandlerAsync } from "./StatusMonitorHandlers";
import {
  getSubcontrollerHandlerAsync,
  postSubcontrollerHandlerAsync,
  patchSubcontrollerHandlerAsync,
  deleteSubcontrollerAsync,
} from "./SubcontrollerHandlers";

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

router.get("/subcontrollers", async (req: Request, res: Response) => {
  const response = await getSubcontrollerHandlerAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.post("/subcontrollers", async (req: Request, res: Response) => {
  const response = await postSubcontrollerHandlerAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.patch("/subcontrollers/:deviceId", async (req: Request, res: Response) => {
  const response = await patchSubcontrollerHandlerAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.delete("/subcontrollers/:deviceId", async (req: Request, res: Response) => {
  const response = await deleteSubcontrollerAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

export default router;
