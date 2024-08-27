import "dotenv/config";
import bcrypt from "bcrypt";
import cookieParser from "cookie-parser";
// import cors from "cors";
import express from "express";
import mysql2 from "mysql2/promise";
import * as winston from "winston";

import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { SprootDB } from "./database/SprootDB";
import { SDBUser } from "@sproot/sproot-common/dist/database/SDBUser";
import { SensorList } from "./sensors/list/SensorList";
import { OutputList } from "./outputs/list/OutputList";

import setupLogger from "./logger";
import ApiRootV2 from "./api/v2/ApiRootV2";

const mysqlConfig = {
  host: process.env["DATABASE_HOST"]!,
  user: process.env["DATABASE_USER"]!,
  password: process.env["DATABASE_PASSWORD"]!,
  database: process.env["DATABASE_NAME"]!,
  port: parseInt(process.env["DATABASE_PORT"]!),
  dateStrings: true,
};

const app = express();
const logger = setupLogger(app);

(async () => {
  const profiler = logger.startTimer();
  logger.info("Initializing sproot app. . .");
  const sprootDB = new SprootDB(await mysql2.createConnection(mysqlConfig));
  app.set("sprootDB", sprootDB);
  app.set("logger", logger);

  await defaultUserCheck(sprootDB, logger);

  logger.info("Creating sensor and output lists. . .");
  const sensorList = new SensorList(
    sprootDB,
    Number(process.env["MAX_CACHE_SIZE"]),
    Number(process.env["INITIAL_CACHE_LOOKBACK"]),
    Number(process.env["MAX_CHART_DATA_POINTS"]),
    Number(process.env["CHART_DATA_POINT_INTERVAL"]),
    logger,
  );
  app.set("sensorList", sensorList);
  const outputList = new OutputList(
    sprootDB,
    Number(process.env["MAX_CACHE_SIZE"]),
    Number(process.env["INITIAL_CACHE_LOOKBACK"]),
    Number(process.env["MAX_CHART_DATA_POINTS"]),
    Number(process.env["CHART_DATA_POINT_INTERVAL"]),
    logger,
  );
  app.set("outputList", outputList);

  logger.info("Initializing sensor and output lists. . .");
  await Promise.all([
    sensorList.initializeOrRegenerateAsync(),
    outputList.initializeOrRegenerateAsync(),
  ]);

  //State update loop
  const updateStateLoop = setInterval(async () => {
    await Promise.all([
      sensorList.initializeOrRegenerateAsync(),
      outputList.initializeOrRegenerateAsync(),
    ]);
    logger.debug("Total memory usage: " + process.memoryUsage.rss() / 1024 / 1024 + "MB");
    //Add triggers and whatnot here.

    outputList.runAutomations(sensorList, new Date());

    //Execute any changes made to state.
    outputList.executeOutputState();
  }, parseInt(process.env["STATE_UPDATE_INTERVAL"]!));

  // Update loop - once a minute, that's the "frequency" of the system.
  const updateDatabaseLoop = setInterval(async () => {
    await sensorList.updateDataStoresAsync();
    await outputList.updateDataStoresAsync();
  }, 60000);

  // app.use(cors());
  app.use(cookieParser());
  app.use(express.json());

  // API v2
  ApiRootV2(app);

  const server = app.listen(process.env["APPLICATION_PORT"]!, () => {
    profiler.done({
      message: "Sproot server initialization time",
      level: "debug",
    });
    logger.info(`sproot is now listening on port ${process.env["APPLICATION_PORT"]}!`);
  });

  // Graceful shutdown on signals
  process.on("SIGINT", async () => {
    await gracefulHalt();
  });
  process.on("SIGTERM", async () => {
    await gracefulHalt();
  });

  async function gracefulHalt() {
    logger.info("Shutting down...");
    server.close(async () => {
      // Stop updating database and sensors
      clearInterval(updateDatabaseLoop);
      clearInterval(updateStateLoop);
      try {
        // Cleanup sensors and turn off outputs
        await app.get("sensorList").disposeAsync();
        await app.get("outputList").dispose();
        // Close database connection
        await sprootDB.disposeAsync();
      } catch (err) {
        //Dgaf, swallow anything, we're shutting down anyway.
        logger.error(err);
      } finally {
        // Give everything a hot sec to finish whatever it's up to - call backs really mess with just calling process.exit.
        setTimeout(() => {
          logger.info("Done! See you next time!");
          process.exit(0);
        }, 250);
      }
    });
  }
})();

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
