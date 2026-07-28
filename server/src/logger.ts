import { Express } from "express";

import * as fs from "fs";
import morgan from "morgan";
import * as winston from "winston";
import "winston-daily-rotate-file";

import { LiveLogTransport } from "./system/LiveLogTransport";
import { LogStreamService } from "./system/LogStreamService";

const testLogger = winston.createLogger({
  transports: [
    new winston.transports.Stream({
      stream: fs.createWriteStream("/dev/null"), // Discard logs to /dev/null
    }),
  ],
});

const productionLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.timestamp({
      format: () => {
        const date = new Date();
        return date.toLocaleString("en-US", {
          timeZone: process.env["TZ"],
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          year: "numeric",
          month: "numeric",
          day: "numeric",
          hour12: true,
          fractionalSecondDigits: 3,
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

export const logger =
  process.env["NODE_ENV"]?.toLowerCase() === "test" ? testLogger : productionLogger;

export default function setupLogger(app: Express): winston.Logger {
  if (process.env["NODE_ENV"]?.toLowerCase() === "test") {
    return testLogger;
  }

  if (
    process.env["NODE_ENV"]?.toLowerCase() !== "production" ||
    process.env["LOG_DEBUG"]?.toLowerCase() === "true"
  ) {
    productionLogger.add(
      new winston.transports.Console({
        level: "debug",
        format: winston.format.combine(
          winston.format.errors({ stack: true }),
          winston.format.colorize(),
          winston.format.printf(formatForDebug),
        ),
      }),
    );
    productionLogger.add(
      new winston.transports.DailyRotateFile({
        filename: "logs/debug-%DATE%.log",
        datePattern: "YYYY-MM-DD",
        level: "debug",
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
          write: (message: string) => productionLogger.http(message.trim()),
        },
      }),
    );
  }

  return productionLogger;
}

function formatForDebug(info: winston.Logform.TransformableInfo): string {
  let base = `[${info["timestamp"]}] ${info.level}: ${info.message}`;
  if (info["durationMs"]) {
    base += ` (${info["durationMs"]}ms)`;
  }
  return base;
}

export function addLogStreamingTransport(
  loggerInstance: winston.Logger,
  logStreamService: LogStreamService,
): void {
  loggerInstance.add(new LiveLogTransport(logStreamService, loggerInstance));
}
