import { CronJob } from "cron";
import winston from "winston";
import { CameraManager } from "../camera/CameraManager";
import { OutputList } from "../outputs/list/OutputList";
import { SensorList } from "../sensors/list/SensorList";
import { SystemStatusMonitor } from "./StatusMonitor";
import * as Constants from "@sproot/sproot-common/dist/utility/Constants";

export function createUpdateDevicesCronJob(
  cameraManager: CameraManager,
  sensorList: SensorList,
  outputList: OutputList,
  systemStatusMonitor: SystemStatusMonitor,
  logger: winston.Logger,
) {
  let running = false;
  return new CronJob(
    Constants.CRON.EVERY_SECOND,
    async function () {
      logger.debug(JSON.stringify(await systemStatusMonitor.getStatusAsync()));
      if (running) {
        logger.warn("Device update cron skipped: previous job still running.");
        return;
      }
      running = true;
      const profiler = logger.startTimer();
      try {
        await Promise.all([
          cameraManager.initializeOrRegenerateAsync(),
          sensorList.initializeOrRegenerateAsync(),
          outputList.initializeOrRegenerateAsync(),
        ]);
      } catch (e) {
        logger.error(`Exception in device update loop: ${e}`);
      } finally {
        profiler.done({ message: "Device update loop time", level: "debug" });
        running = false;
      }
    },
    () => {
      logger.warn("Device update cron stopped.");
    },
    true,
    null,
    null,
    null,
    null,
    null,
    true,
    (err) => logger.error(`Device update cron error: ${err}`),
  );
}

export function createRunAutomationsCronJob(
  sensorList: SensorList,
  outputList: OutputList,
  logger: winston.Logger,
) {
  let running = false;
  return new CronJob(
    Constants.CRON.EVERY_SECOND,
    async function () {
      if (running) {
        logger.warn("Automation cron skipped: previous job still running.");
        return;
      }
      running = true;
      const profiler = logger.startTimer();
      try {
        await outputList.runAutomationsAsync(sensorList, new Date());
      } catch (e) {
        logger.error(`Exception in automation loop: ${e}`);
      } finally {
        profiler.done({ message: "Automation loop time", level: "debug" });
        running = false;
      }
    },
    () => {
      logger.warn("Automation cron stopped.");
    },
    true,
    null,
    null,
    null,
    null,
    null,
    true,
    (err) => logger.error(`Automation cron error: ${err}`),
  );
}

export function createDatabaseUpdateCronJob(
  sensorList: SensorList,
  outputList: OutputList,
  logger: winston.Logger,
) {
  let running = false;
  return new CronJob(
    Constants.CRON.EVERY_MINUTE,
    async function () {
      if (running) {
        logger.warn("Database update cron skipped: previous job still running.");
        return;
      }
      running = true;
      try {
        await sensorList.updateDataStoresAsync();
        await outputList.updateDataStoresAsync();
      } catch (e) {
        logger.error(`Exception in database update loop: ${e}`);
      } finally {
        running = false;
      }
    },
    () => {
      logger.warn("Database update cron stopped.");
    },
    true,
    null,
    null,
    null,
    null,
    null,
    null,
    (err) => logger.error(`State update cron error: ${err}`),
  );
}
