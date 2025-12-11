import express, { Request, Response } from "express";
import { powerOffHandler } from "./PowerOffHandlers";
import { systemStatusMonitorHandlerAsync } from "./StatusMonitorHandlers";
import {
  systemBackupCreateHandlerAsync,
  systemBackupCreateStatusHandlerAsync,
  systemBackupDownloadHandlerAsync,
  systemBackupListHandlerAsync,
  systemBackupRestoreHandlerAsync,
} from "./BackupHandlers";

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

router.get("/backups/list", async (_req: Request, res: Response) => {
  const response = await systemBackupListHandlerAsync(res);

  res.status(response.statusCode).json(response);
  return;
});

router.get("/backups/download/:fileName", async (req: Request, res: Response) => {
  await systemBackupDownloadHandlerAsync(req, res);
  return;
});

router.post("/backups/restore", async (req: Request, res: Response) => {
  await systemBackupRestoreHandlerAsync(req, res);
  return;
});

router.post("/backups/create", async (req: Request, res: Response) => {
  const response = await systemBackupCreateHandlerAsync(req, res);

  res.status(response.statusCode).json(response);
  return;
});

router.get("/backups/create/status", async (_req: Request, res: Response) => {
  const response = await systemBackupCreateStatusHandlerAsync(res);

  res.status(response.statusCode).json(response);
  return;
});

export default router;
