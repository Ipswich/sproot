import express, { Request, Response } from "express";

import {
  getSubcontrollerHandlerAsync,
  getSubcontrollerOnlineAsync,
  postSubcontrollerHandlerAsync,
  patchSubcontrollerHandlerAsync,
  deleteSubcontrollerAsync,
} from "./handlers/SubcontrollerHandlers";

import {
  getESP32FirmwareBinaryAsync,
  getESP32ManifestAsync,
  updateESP32FirmwareOTAAsync,
} from "./handlers/ESP32Handlers";

const router = express.Router();

router.get("/", async (req: Request, res: Response) => {
  const response = await getSubcontrollerHandlerAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.post("/", async (req: Request, res: Response) => {
  const response = await postSubcontrollerHandlerAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.patch("/:deviceId", async (req: Request, res: Response) => {
  const response = await patchSubcontrollerHandlerAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.delete("/:deviceId", async (req: Request, res: Response) => {
  const response = await deleteSubcontrollerAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.get("/:deviceId/connection-status", async (req: Request, res: Response) => {
  const response = await getSubcontrollerOnlineAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.get("/firmware/esp32/manifest", async (req: Request, res: Response) => {
  const response = await getESP32ManifestAsync(req, res);
  res.status(response.statusCode).json(response);
});

router.get("/firmware/esp32/binary", async (req: Request, res: Response) => {
  await getESP32FirmwareBinaryAsync(req, res);
});

router.post("/firmware/esp32/ota-update/:deviceId", async (req: Request, res: Response) => {
  const response = await updateESP32FirmwareOTAAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

export default router;
