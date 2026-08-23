import express, { Request, Response } from "express";
import {
  getLatestImageAsync,
  streamHandlerAsync,
  clearAllImagesHandlerAsync,
} from "./handlers/CameraHandlers";
import {
  createCameraSettingsAsync,
  deleteCameraSettingsAsync,
  getCameraSettingsAsync,
  listCameraSettingsAsync,
  updateCameraSettingsAsync,
} from "./handlers/CameraSettingsHandlers";
import {
  getTimelapseArchiveAsync,
  getTimelapseGenerationStatus,
  postRegenerateTimelapseArchive,
} from "./handlers/TimelapseHandlers";

const router = express.Router();

router.get("/", async (req: Request, res: Response) => {
  const response = await listCameraSettingsAsync(req, res);
  res.status(response.statusCode).json(response);
});

router.post("/", async (req: Request, res: Response) => {
  const response = await createCameraSettingsAsync(req, res);
  res.status(response.statusCode).json(response);
});

router.get("/:cameraId/settings", async (req: Request, res: Response) => {
  const response = await getCameraSettingsAsync(req, res);
  res.status(response.statusCode).json(response);
});

router.patch("/:cameraId/settings", async (req: Request, res: Response) => {
  const response = await updateCameraSettingsAsync(req, res);
  res.status(response.statusCode).json(response);
});

router.delete("/:cameraId", async (req: Request, res: Response) => {
  const response = await deleteCameraSettingsAsync(req, res);
  res.status(response.statusCode).json(response);
});

router.get("/:cameraId/stream", async (req: Request, res: Response) => {
  await streamHandlerAsync(req, res);
});

router.get("/:cameraId/latest-image", async (req: Request, res: Response) => {
  await getLatestImageAsync(req, res);
});

router.get("/:cameraId/timelapse/archive", async (req: Request, res: Response) => {
  await getTimelapseArchiveAsync(req, res);
});

router.post("/:cameraId/timelapse/archive/regenerate", (req: Request, res: Response) => {
  postRegenerateTimelapseArchive(req, res);
});

router.get("/:cameraId/timelapse/archive/status", (req: Request, res: Response) => {
  getTimelapseGenerationStatus(req, res);
});

router.delete("/:cameraId/timelapse/images", async (req: Request, res: Response) => {
  await clearAllImagesHandlerAsync(req, res);
});

export default router;
