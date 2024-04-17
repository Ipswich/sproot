import bcrypt from "bcrypt";
import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";
import express from "express";
import morgan from "morgan";
import mysql2 from "mysql2/promise";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import * as winston from "winston";
import "winston-daily-rotate-file";

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
  dateStrings: true,
};

const app = express();

const swaggerOptions = YAML.load("./openapi.yml");
swaggerOptions.defaultModelsExpandDepth = -1;

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.timestamp({
      format: () => {
        return new Date().toLocaleString("en-US", {
          timeZone: process.env["TZ"],
        });
      },
    }),
    winston.format.colorize(),
    winston.format.printf((info) => `[${info["timestamp"]}] ${info.level}: ${info.message}`),
  ),
  transports: [
    new winston.transports.DailyRotateFile({
      filename: "logs/sproot-server-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxFiles: "30d",
    }),
  ],
});

if (process.env["NODE_ENV"]?.toLowerCase() !== "production") {
  logger.add(
    new winston.transports.Console({
      level: "debug",
      format: winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.colorize(),
        winston.format.printf(formatForDebug),
      ),
    }),
  );
  logger.add(
    new winston.transports.File({
      filename: "logs/debug.log",
      level: "debug",
      format: winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.colorize(),
        winston.format.printf(formatForDebug),
      ),
    }),
  );
  app.use(
    morgan("dev", {
      stream: {
        write: (message: string) => logger.http(message.trim()),
      },
    }),
  );
}

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
    Number(process.env["CHART_DATA_POINT_INTERVAL"]),
    logger,
  );
  app.set("sensorList", sensorList);
  const outputList = new OutputList(
    sprootDB,
    Number(process.env["MAX_CACHE_SIZE"]),
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
  await outputList.addReadingsToDatabaseAsync();

  //State update loop
  const updateStateLoop = setInterval(async () => {
    await Promise.all([
      sensorList.initializeOrRegenerateAsync(),
      outputList.initializeOrRegenerateAsync(),
    ]);
    //Add triggers and shit here.

    //Execute any changes made to state.
    outputList.executeOutputState();
  }, parseInt(process.env["STATE_UPDATE_INTERVAL"]!));

  // Database update loop
  const updateDatabaseLoop = setInterval(async () => {
    await sensorList.addReadingsToDatabaseAsync();
    await outputList.addReadingsToDatabaseAsync();
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

function formatForDebug(info: winston.Logform.TransformableInfo): string {
  let base = `[${info["timestamp"]}] ${info.level}: ${info.message}`;
  if (info["durationMs"]) {
    base += ` (${info["durationMs"]}ms)`;
  }
  return base;
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
