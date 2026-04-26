import "dotenv/config";
import bcrypt from "bcrypt";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Express } from "express";
import * as winston from "winston";

import * as Constants from "@sproot/sproot-common/dist/utility/Constants";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { SprootDB } from "./database/SprootDB";
import { SDBUser } from "@sproot/sproot-common/dist/database/SDBUser";
import { SensorList } from "./sensors/list/SensorList";
import { OutputList } from "./outputs/list/OutputList";
import { DI_KEYS } from "./utils/DependencyInjectionConstants";
import setupLogger from "./logger";
import ApiRootV2 from "./api/v2/ApiRootV2";
import { AutomationService } from "./automation/AutomationService";
import { getKnexConnectionAsync } from "./database/KnexUtilities";
import { CameraManager } from "./camera/CameraManager";
import { JournalService } from "./journals/JournalService";
import { SystemStatusMonitor } from "./system/StatusMonitor";
import {
  createDatabaseUpdateCronJob,
  createAutomationsCronJob,
  createUpdateDevicesCronJob,
  createBackupCronJob,
} from "./system/CronJobs";
import { MdnsService } from "./system/MdnsService";
import { NotificationActionManager } from "./automation/notifications/NotificationActionManager";

export default async function setupAsync(): Promise<Express> {
  const app = express();
  const logger = setupLogger(app);
  const profiler = logger.startTimer();
  logger.info("Initializing sproot app. . .");
  const knexConnection = await getKnexConnectionAsync();
  app.set(DI_KEYS.KnexConnection, knexConnection);

  const sprootDB = new SprootDB(knexConnection);
  app.set(DI_KEYS.SprootDB, sprootDB);
  app.set(DI_KEYS.Logger, logger);

  await defaultUserCheck(sprootDB, logger);

  const mdnsService = new MdnsService(logger);
  app.set(DI_KEYS.MdnsService, mdnsService);

  const journalService = new JournalService(sprootDB);
  app.set(DI_KEYS.JournalService, journalService);

  const automationService = await AutomationService.createInstanceAsync(sprootDB, logger);
  app.set(DI_KEYS.AutomationService, automationService);

  const notificationActionManager = await NotificationActionManager.createInstanceAsync(
    automationService,
    sprootDB,
    logger,
  );
  app.set(DI_KEYS.NotificationActionManager, notificationActionManager);

  logger.info("Creating camera manager. . .");
  const cameraManager = await CameraManager.createInstanceAsync(
    sprootDB,
    process.env["INTERSERVICE_AUTHENTICATION_KEY"]!,
    logger,
  );
  app.set(DI_KEYS.CameraManager, cameraManager);

  logger.info("Creating sensor and output lists. . .");
  const sensorList = await SensorList.createInstanceAsync(
    sprootDB,
    mdnsService,
    Constants.MAX_CACHE_SIZE,
    Constants.INITIAL_CACHE_LOOKBACK,
    Constants.MAX_CHART_DATA_POINTS,
    Constants.CHART_DATA_POINT_INTERVAL,
    logger,
  );
  app.set(DI_KEYS.SensorList, sensorList);
  const outputList = await OutputList.createInstanceAsync(
    automationService,
    sprootDB,
    mdnsService,
    Constants.MAX_CACHE_SIZE,
    Constants.INITIAL_CACHE_LOOKBACK,
    Constants.MAX_CHART_DATA_POINTS,
    Constants.CHART_DATA_POINT_INTERVAL,
    logger,
  );
  app.set(DI_KEYS.OutputList, outputList);

  const systemStatusMonitor = new SystemStatusMonitor(cameraManager, sprootDB, knexConnection);
  app.set(DI_KEYS.SystemStatusMonitor, systemStatusMonitor);

  logger.info("Initializing camera manager, and sensor and output lists. . .");
  await Promise.all([
    cameraManager.regenerateAsync(),
    sensorList.regenerateAsync(),
    outputList.regenerateAsync(),
  ]);

  // Cron Jobs
  const updateDevicesCronJob = createUpdateDevicesCronJob(
    cameraManager,
    sensorList,
    outputList,
    logger,
  );
  app.set(DI_KEYS.UpdateDevicesCronJob, updateDevicesCronJob);

  const automationsCronJob = createAutomationsCronJob(
    automationService,
    sensorList,
    outputList,
    logger,
  );
  app.set(DI_KEYS.AutomationsCronJob, automationsCronJob);

  const updateDatabaseCronJob = createDatabaseUpdateCronJob(sensorList, outputList, logger);
  app.set(DI_KEYS.DatabaseUpdateCronJob, updateDatabaseCronJob);

  const backupCronJob = createBackupCronJob(sprootDB, logger);
  app.set(DI_KEYS.BackupCronJob, backupCronJob);

  app.use(cors());
  app.use(cookieParser());
  app.use(express.json());

  // API v2 handlers
  ApiRootV2(app);

  profiler.done({
    message: "Sproot server initialization time",
    level: "debug",
  });

  return app;
}

export async function gracefulHaltAsync(
  server: import("http").Server,
  app: Express,
  afterHalt?: () => Promise<void>,
) {
  const logger = app.get(DI_KEYS.Logger);
  logger.info("Shutting down...");
  server.closeAllConnections();
  server.close(async () => {
    app.get(DI_KEYS.MdnsService)[Symbol.dispose]();
    // Stop updating database and sensors
    await app.get(DI_KEYS.DatabaseUpdateCronJob).stop();
    await app.get(DI_KEYS.AutomationsCronJob).stop();
    await app.get(DI_KEYS.UpdateDevicesCronJob).stop();
    await app.get(DI_KEYS.BackupCronJob).stop();
    try {
      // Cleanup Cameras
      await app.get(DI_KEYS.CameraManager)[Symbol.asyncDispose]();

      // Cleanup sensors and turn off outputs
      await app.get(DI_KEYS.SensorList)[Symbol.asyncDispose]();
      await app.get(DI_KEYS.OutputList)[Symbol.asyncDispose]();

      // Cleanup system status monitor
      app.get(DI_KEYS.SystemStatusMonitor)[Symbol.dispose]();

      // Cleanup notification action manager
      app.get(DI_KEYS.NotificationActionManager)[Symbol.dispose]();

      // Close database connection
      await app.get(DI_KEYS.SprootDB)[Symbol.asyncDispose]();
    } catch (err) {
      //Dgaf, swallow anything, we're shutting down anyway.
      logger.error(err);
    } finally {
      if (afterHalt) {
        await afterHalt();
      }
      // Give everything a hot sec to finish whatever it's up to - call backs really mess with just calling process.exit.
      setTimeout(() => {
        logger.info("Done! See you next time!");
        process.exit(0);
      }, 250);
    }
  });
}

async function defaultUserCheck(sprootDB: ISprootDB, logger: winston.Logger) {
  const defaultUser = {
    username: process.env["DEFAULT_USER"]!,
    hash: process.env["DEFAULT_USER_PASSWORD"]!,
    email: process.env["DEFAULT_USER_EMAIL"]!,
  } as SDBUser;

  const user = await sprootDB.getUserAsync(defaultUser.username);
  if (user?.length == 0) {
    logger.info("Default user not found, creating from environment variables.");
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(defaultUser.hash, salt);
    defaultUser.hash = hash;
    await sprootDB.addUserAsync(defaultUser);
  }
}
