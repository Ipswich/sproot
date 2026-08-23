import { Express } from "express";

import * as fs from "fs";
import morgan from "morgan";
import * as winston from "winston";
import "winston-daily-rotate-file";

import { LiveLogTransport } from "./system/LiveLogTransport";
import { IEventBus } from "./eventbus/IEventBus";

export class DebugLoggingController {
  readonly #logger: winston.Logger;
  #enabled = false;
  #consoleTransport: winston.transport | undefined;
  #fileTransport: winston.transport | undefined;

  constructor(loggerInstance: winston.Logger) {
    this.#logger = loggerInstance;
    this.#logger.level = "info";
  }

  get isEnabled(): boolean {
    return this.#enabled;
  }

  setEnabled(enabled: boolean): boolean {
    if (this.#enabled === enabled) {
      return false;
    }

    this.#enabled = enabled;
    this.#logger.level = enabled ? "debug" : "info";

    if (enabled) {
      this.#consoleTransport = new winston.transports.Console({
        level: "debug",
        format: winston.format.combine(
          winston.format.errors({ stack: true }),
          winston.format.colorize(),
          winston.format.printf(formatForDebug),
        ),
      });
      this.#fileTransport = new winston.transports.DailyRotateFile({
        filename: "logs/debug-%DATE%.log",
        datePattern: "YYYY-MM-DD",
        level: "debug",
        format: winston.format.combine(
          winston.format.errors({ stack: true }),
          winston.format.colorize(),
          winston.format.printf(formatForDebug),
        ),
        maxFiles: "30d",
      });
      this.#logger.add(this.#consoleTransport);
      this.#logger.add(this.#fileTransport);
      return true;
    }

    if (this.#consoleTransport) {
      this.#logger.remove(this.#consoleTransport);
      this.#consoleTransport = undefined;
    }

    if (this.#fileTransport) {
      this.#logger.remove(this.#fileTransport);
      this.#fileTransport = undefined;
    }

    return true;
  }
}

export interface LoggerSetupResult {
  logger: winston.Logger;
  debugLoggingController: DebugLoggingController;
}

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

export default function setupLogger(app: Express): LoggerSetupResult {
  if (process.env["NODE_ENV"]?.toLowerCase() === "test") {
    return {
      logger: testLogger,
      debugLoggingController: new DebugLoggingController(testLogger),
    };
  }

  const debugLoggingController = new DebugLoggingController(productionLogger);

  app.use(
    morgan("dev", {
      skip: () => !debugLoggingController.isEnabled,
      stream: {
        write: (message: string) => productionLogger.http(message.trim()),
      },
    }),
  );

  return {
    logger: productionLogger,
    debugLoggingController,
  };
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
  eventBus: IEventBus,
): void {
  loggerInstance.add(new LiveLogTransport(eventBus, loggerInstance));
}
