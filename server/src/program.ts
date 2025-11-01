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

import setupLogger from "./logger";
import ApiRootV2 from "./api/v2/ApiRootV2";
import { AutomationDataManager } from "./automation/AutomationDataManager";
import { getKnexConnectionAsync } from "./database/KnexUtilities";
import { CameraManager } from "./camera/CameraManager";
import { SystemStatusMonitor } from "./system/StatusMonitor";
import {
  createDatabaseUpdateCronJob,
  createRunAutomationsCronJob,
  createUpdateDevicesCronJob,
} from "./system/CronJobs";
import { MdnsService } from "./system/MdnsService";

export default async function setupAsync(): Promise<Express> {
  const app = express();
  const logger = setupLogger(app);
  const profiler = logger.startTimer();
  logger.info("Initializing sproot app. . .");
  const knexConnection = await getKnexConnectionAsync();
  app.set("knexConnection", knexConnection);

  const sprootDB = new SprootDB(knexConnection);
  app.set("sprootDB", sprootDB);
  app.set("logger", logger);

  await defaultUserCheck(sprootDB, logger);

  const mdnsService = new MdnsService(logger);
  app.set("bonjourService", mdnsService);

  logger.info("Creating camera manager. . .");
  const cameraManager = new CameraManager(
    sprootDB,
    process.env["INTERSERVICE_AUTHENTICATION_KEY"]!,
    logger,
  );
  app.set("cameraManager", cameraManager);

  logger.info("Creating sensor and output lists. . .");
  const sensorList = new SensorList(
    sprootDB,
    mdnsService,
    Constants.MAX_CACHE_SIZE,
    Constants.INITIAL_CACHE_LOOKBACK,
    Constants.MAX_CHART_DATA_POINTS,
    Constants.CHART_DATA_POINT_INTERVAL,
    logger,
  );
  app.set("sensorList", sensorList);
  const outputList = new OutputList(
    sprootDB,
    mdnsService,
    Constants.MAX_CACHE_SIZE,
    Constants.INITIAL_CACHE_LOOKBACK,
    Constants.MAX_CHART_DATA_POINTS,
    Constants.CHART_DATA_POINT_INTERVAL,
    logger,
  );
  app.set("outputList", outputList);

  const systemStatusMonitor = new SystemStatusMonitor(cameraManager, sprootDB, knexConnection);
  app.set("systemStatusMonitor", systemStatusMonitor);

  logger.info("Initializing camera manager, and sensor and output lists. . .");
  await Promise.all([
    cameraManager.initializeOrRegenerateAsync(),
    sensorList.initializeOrRegenerateAsync(),
    outputList.initializeOrRegenerateAsync(),
  ]);

  const automationDataManager = new AutomationDataManager(sprootDB, outputList);
  app.set("automationDataManager", automationDataManager);

  // Cron Jobs
  const updateDevicesCronJob = createUpdateDevicesCronJob(
    cameraManager,
    sensorList,
    outputList,
    logger,
  );
  app.set("updateDevicesCronJob", updateDevicesCronJob);

  const automationsCronJuob = createRunAutomationsCronJob(sensorList, outputList, logger);
  app.set("automationsCronJuob", automationsCronJuob);

  const updateDatabaseCronJob = createDatabaseUpdateCronJob(sensorList, outputList, logger);
  app.set("updateDatabaseCronJob", updateDatabaseCronJob);

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
