import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import bcrypt from "bcrypt";
import express from "express";
import mysql2 from "mysql2/promise";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import winston from "winston";

import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { SprootDB } from "./database/SprootDB";
import { SensorList } from "./sensors/SensorList";
import { OutputList } from "./outputs/OutputList";

import login, { authenticate } from "./api/v1/middleware/Authentication";
import sensorRouter from "./api/v1/SensorRouter";
import outputRouter from "./api/v1/OutputRouter";
import homeRouter from "./api/v1/HomeRouter";
import { SDBUser } from "@sproot/sproot-common/dist/database/SDBUser";

const mysqlConfig = {
  host: process.env["DATABASE_HOST"]!,
  user: process.env["DATABASE_USER"]!,
  password: process.env["DATABASE_PASSWORD"]!,
  database: process.env["DATABASE_NAME"]!,
  port: parseInt(process.env["DATABASE_PORT"]!),
};

const swaggerOptions = YAML.load("./openapi.yml");
swaggerOptions.defaultModelsExpandDepth = -1;

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
  ],
});

if (process.env["NODE_ENV"]?.toLowerCase() !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  );
}

const app = express();

(async () => {
  logger.info("Initializing sproot app. . .");
  const sprootDB = new SprootDB(await mysql2.createConnection(mysqlConfig));
  app.set("sprootDB", sprootDB);
  app.set("logger", logger);
  await defaultUserCheck(sprootDB, logger);

  const sensorList = new SensorList(sprootDB, logger);
  app.set("sensorList", sensorList);
  const outputList = new OutputList(sprootDB, logger);
  app.set("outputList", outputList);

  await Promise.all([
    sensorList.initializeOrRegenerateAsync,
    outputList.initializeOrRegenerateAsync,
  ]);
  await sensorList.getReadingsAsync();
  await sensorList.addReadingsToDatabaseAsync();

  //State update loop
  const updateStateLoop = setInterval(async () => {
    console.time("initializeOrRegenerate");
    await Promise.all([
      sensorList.initializeOrRegenerateAsync,
      outputList.initializeOrRegenerateAsync,
    ]);
    console.timeEnd("initializeOrRegenerate");
    console.time("getReadings");
    await sensorList.getReadingsAsync();
    console.timeEnd("getReadings");
    //Add triggers and shit here.

    //Execute any changes made to state.
    console.time("executeOutputState");
    outputList.executeOutputState();
    console.timeEnd("executeOutputState");
  }, parseInt(process.env["STATE_UPDATE_INTERVAL"]!));

  // Database update loop
  const updateDatabaseLoop = setInterval(async () => {
    console.time("addReadingsToDatabaseAsync");
    await sensorList.addReadingsToDatabaseAsync();
    console.timeEnd("addReadingsToDatabaseAsync");
  }, parseInt(process.env["DATABASE_UPDATE_INTERVAL"]!));

  app.use(cors());
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use("/api/v1/authenticate", login);
  app.use("/api/v1/", homeRouter);
  app.use("/api/v1/sensors", authenticate, sensorRouter);
  app.use("/api/v1/outputs", authenticate, outputRouter);

  app.use(
    "/api/v1/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerOptions, {
      swaggerOptions: { defaultModelsExpandDepth: -1 },
    }),
  );

  const server = app.listen(process.env["APPLICATION_PORT"]!, () => {
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
