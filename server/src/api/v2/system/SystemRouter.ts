import express, { Request, Response } from "express";
import { powerOffHandler } from "./PowerOffHandlers";
import { systemStatusMonitorHandlerAsync } from "./StatusMonitorHandlers";
import {
  getExternalDevicesHandlerAsync,
  postExternalDevicesHandlerAsync,
  patchExternalDevicesHandlerAsync,
  deleteExternalDevicesHandlerAsync,
} from "./ExternalDevicesHandlers";

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

router.get("/external-devices", async (req: Request, res: Response) => {
  const response = await getExternalDevicesHandlerAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.post("/external-devices", async (req: Request, res: Response) => {
  const response = await postExternalDevicesHandlerAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.patch("/external-devices/:deviceId", async (req: Request, res: Response) => {
  const response = await patchExternalDevicesHandlerAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.delete("/external-devices/:deviceId", async (req: Request, res: Response) => {
  const response = await deleteExternalDevicesHandlerAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

export default router;
