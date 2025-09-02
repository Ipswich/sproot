import { CronJob } from "cron";
import winston from "winston";
import { CameraManager } from "../camera/CameraManager";
import { OutputList } from "../outputs/list/OutputList";
import { SensorList } from "../sensors/list/SensorList";
import { SystemStatusMonitor } from "./StatusMonitor";
import * as Constants from "@sproot/sproot-common/dist/utility/Constants";

export function createUpdateDeviceListsCronJob(
  cameraManager: CameraManager,
  sensorList: SensorList,
  outputList: OutputList,
  systemStatusMonitor: SystemStatusMonitor,
  logger: winston.Logger,
) {
  return new CronJob(
    Constants.CRON.EVERY_SECOND,
    async function () {
      let running = false;
      if (running) {
        logger.warn("Device update cron skipped: previous job still running.");
        return;
      }
      running = true;
      try {
        logger.debug(JSON.stringify(await systemStatusMonitor.getStatusAsync()));
        await Promise.all([
          cameraManager.initializeOrRegenerateAsync(),
          sensorList.initializeOrRegenerateAsync(),
          outputList.initializeOrRegenerateAsync(),
        ]);
      } catch (e) {
        logger.error(`Exception in device update loop: ${e}`);
      } finally {
        running = false;
      }
    },
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    (err) => logger.error(`Device update cron error: ${err}`),
  );
}

export function createAutomationEvaluationCronJob(
  sensorList: SensorList,
  outputList: OutputList,
  logger: winston.Logger,
) {
  let running = false;
  return new CronJob(
    Constants.CRON.EVERY_SECOND,
    async function () {
      if (running) {
        logger.warn("Automation evaluation cron skipped: previous job still running.");
        return;
      }
      running = true;
      try {
        await outputList.runAutomationsAsync(sensorList, new Date());
        await outputList.executeOutputStateAsync();
      } catch (e) {
        logger.error(`Exception in automation evaluation loop: ${e}`);
      } finally {
        running = false;
      }
    },
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    (err) => logger.error(`Automation evaluation cron error: ${err}`),
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
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    (err) => logger.error(`State update cron error: ${err}`),
  );
}
