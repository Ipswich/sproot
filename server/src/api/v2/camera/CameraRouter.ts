import express, { Request, Response } from "express";
import {
  getLatestImageAsync,
  reconnectLivestreamAsync,
  streamHandlerAsync,
} from "./handlers/CameraHandlers";
import { getCameraSettings, updateCameraSettingsAsync } from "./handlers/CameraSettingsHandlers";
import {
  getTimelapseArchiveAsync,
  getTimelapseGenerationStatus,
  postRegenerateTimelapseArchive,
} from "./handlers/TimelapseHandlers";

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

router.get("/timelapse/archive", async (req: Request, res: Response) => {
  await getTimelapseArchiveAsync(req, res);
});

router.post("/timelapse/archive/regenerate", (req: Request, res: Response) => {
  postRegenerateTimelapseArchive(req, res);
});

router.get("/timelapse/archive/status", (req: Request, res: Response) => {
  getTimelapseGenerationStatus(req, res);
});

router.post("/reconnect", async (req: Request, res: Response) => {
  await reconnectLivestreamAsync(req, res);
});

export default router;
