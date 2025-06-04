import express, { Request, Response } from "express";
import {
  getLatestImageAsync,
  reconnectLivestreamAsync,
  streamHandlerAsync,
} from "./handlers/CameraHandlers";

import {
  getCameraSettings,
  updateCameraSettingsAsync,
} from "./handlers/CameraSettingsHandlers";

const router = express.Router();
router.get("/settings", (req: Request, res: Response) => {
  const response = getCameraSettings(req, res);
  res.status(response.statusCode).json(response);
});

router.patch("/settings", async (req: Request, res: Response) => {
  const response = await updateCameraSettingsAsync(req, res);
  res.status(response.statusCode).json(response);
});

router.get("/stream", async (req: Request, res: Response) => {
  await streamHandlerAsync(req, res);
});

router.get("/latest-image", async (req: Request, res: Response) => {
  await getLatestImageAsync(req, res);
});

router.post("/reconnect", async (req: Request, res: Response) => {
  await reconnectLivestreamAsync(req, res);
});

export default router;
