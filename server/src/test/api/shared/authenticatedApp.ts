import { Express } from "express";

import mainAsync from "../../../program";
import { DI_KEYS } from "../../../utils/DependencyInjectionConstants";

export async function createAuthenticatedAppAsync(): Promise<Express> {
  return mainAsync();
}

export async function disposeTestAppAsync(app: Express): Promise<void> {
  app.get(DI_KEYS.MdnsService)[Symbol.dispose]();
  await app.get(DI_KEYS.DatabaseUpdateCronJob).stop();
  await app.get(DI_KEYS.AutomationsCronJob).stop();
  await app.get(DI_KEYS.UpdateDevicesCronJob).stop();
  await app.get(DI_KEYS.BackupCronJob).stop();
  await app.get(DI_KEYS.CameraManager)[Symbol.asyncDispose]();
  await app.get(DI_KEYS.SensorList)[Symbol.asyncDispose]();
  await app.get(DI_KEYS.OutputList)[Symbol.asyncDispose]();
  app.get(DI_KEYS.SystemStatusMonitor)[Symbol.dispose]();
  app.get(DI_KEYS.NotificationActionManager)[Symbol.dispose]();
  await app.get(DI_KEYS.SprootDB)[Symbol.asyncDispose]();
}