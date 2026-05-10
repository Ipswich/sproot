import express, { Request, Response } from "express";
import {
  getLatestImageAsync,
  reconnectLivestreamAsync,
  streamHandlerAsync,
  clearAllImagesHandlerAsync,
} from "./handlers/CameraHandlers";
import { getCameraSettings, updateCameraSettingsAsync } from "./handlers/CameraSettingsHandlers";
import {
  getTimelapseArchiveAsync,
  getTimelapseGenerationStatus,
  postRegenerateTimelapseArchive,
} from "./handlers/TimelapseHandlers";
import createContractRoute from "../../validation/createContractRoute";

const router = express.Router();
router.get(
  "/settings",
  createContractRoute("getCameraSettings", (req: Request, res: Response) => {
    const response = getCameraSettings(req, res);
    res.status(response.statusCode).json(response);
  })
);

router.patch(
  "/settings",
  createContractRoute("updateCameraSettings", async (req: Request, res: Response) => {
    const response = await updateCameraSettingsAsync(req, res);
    res.status(response.statusCode).json(response);
  })
);

router.get(
  "/stream",
  createContractRoute("getCameraStream", async (req: Request, res: Response) => {
    await streamHandlerAsync(req, res);
  })
);

router.get(
  "/latest-image",
  createContractRoute("getLatestCameraImage", async (req: Request, res: Response) => {
    await getLatestImageAsync(req, res);
  })
);

router.get(
  "/timelapse/archive",
  createContractRoute("downloadTimelapseArchive", async (req: Request, res: Response) => {
    await getTimelapseArchiveAsync(req, res);
  })
);

router.post(
  "/timelapse/archive/regenerate",
  createContractRoute("regenerateTimelapseArchive", (req: Request, res: Response) => {
    postRegenerateTimelapseArchive(req, res);
  })
);

router.get(
  "/timelapse/archive/status",
  createContractRoute("getTimelapseArchiveStatus", (req: Request, res: Response) => {
    getTimelapseGenerationStatus(req, res);
  })
);

router.post(
  "/reconnect",
  createContractRoute("reconnectCamera", async (req: Request, res: Response) => {
    await reconnectLivestreamAsync(req, res);
  })
);

router.delete(
  "/timelapse/images",
  createContractRoute("clearTimelapseImages", async (req: Request, res: Response) => {
    await clearAllImagesHandlerAsync(req, res);
  })
);

export default router;
