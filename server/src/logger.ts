import { Express } from "express";
import * as fs from "fs";
import morgan from "morgan";
import * as winston from "winston";
import "winston-daily-rotate-file";

export default function setupLogger(app: Express): winston.Logger {
  if (process.env["NODE_ENV"]?.toLowerCase() === "test") {
    return winston.createLogger({
      transports: [
        new winston.transports.Stream({
          stream: fs.createWriteStream("/dev/null"), // Discard logs to /dev/null
        }),
      ],
    });
  }

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

  if (
    process.env["NODE_ENV"]?.toLowerCase() !== "production" ||
    process.env["LOG_DEBUG"]?.toLowerCase() === "true"
  ) {
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
      new winston.transports.DailyRotateFile({
        filename: "logs/debug.log",
        datePattern: "YYYY-MM-DD",
        level: "debug-%DATE%.log",
        format: winston.format.combine(
          winston.format.errors({ stack: true }),
          winston.format.colorize(),
          winston.format.printf(formatForDebug),
        ),
        maxFiles: "30d",
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

  return logger;
}

function formatForDebug(info: winston.Logform.TransformableInfo): string {
  let base = `[${info["timestamp"]}] ${info.level}: ${info.message}`;
  if (info["durationMs"]) {
    base += ` (${info["durationMs"]}ms)`;
  }
  return base;
}
