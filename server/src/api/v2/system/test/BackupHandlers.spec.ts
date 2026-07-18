import {
  systemBackupCreateHandlerAsync,
  systemBackupCreateStatusHandlerAsync,
  systemBackupDownloadHandlerAsync,
  systemBackupListHandlerAsync,
  systemBackupRestoreHandlerAsync,
} from "../BackupHandlers";
import { Request, Response } from "express";
import { assert } from "chai";
import sinon, { SinonSpy } from "sinon";
import winston from "winston";
import { SuccessResponse } from "@sproot/sproot-common/dist/api/v2/Responses";
import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import { PassThrough, Readable } from "stream";
import { Backups } from "../../../../system/Backups";

describe("BackupHandlers.ts", () => {
  let logger: winston.Logger;
  before(() => {
    logger = winston.createLogger({
      transports: [new winston.transports.Console({ silent: true })],
    });
  });

  describe("systemBackupListHandlerAsync", () => {
    it("should return 200 and a list of backup file names", async () => {
      const response = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const result = (await systemBackupListHandlerAsync(response)) as SuccessResponse;
      assert.equal(result.statusCode, 200);
      assert.equal(result.timestamp, response.locals["defaultProperties"]["timestamp"]);
      assert.equal(result.requestId, response.locals["defaultProperties"]["requestId"]);
      assert.isArray(result.content!.data);
    });
  });

  describe("systemBackupDownloadHandlerAsync", () => {
    it("should return a 200 and stream the backup file when it exists", async () => {
      // Setup: Create a temporary backup file
      const tempDir = path.join(
        tmpdir(),
        `test-backup-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      );
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }
      const tempFileName = "test-backup-file.sproot";
      const tempFilePath = path.join(tempDir, tempFileName);
      fs.writeFileSync(tempFilePath, "test data");

      const original = Backups.getByFileNameAsync;

      sinon.stub(Backups, "getByFileNameAsync").callsFake((fileName, logger, _directory) => {
        return original.call(Backups, fileName, logger, tempDir);
      });

      const response = {
        status: sinon.stub().returnsThis(),
        setHeader: sinon.stub().returnsThis(),
        // Add stream event handlers so piping to this mocked response works
        on: sinon.stub().returnsThis(),
        once: sinon.stub().returnsThis(),
        emit: sinon.stub().returnsThis(),
        write: sinon.stub().returnsThis(),
        end: sinon.stub().returnsThis(),
        error: sinon.stub().returnsThis(),
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const request = {
        params: { fileName: "test-backup-file" },
        app: {
          get: (_dependency: string) => logger,
        },
      } as unknown as Request;

      await systemBackupDownloadHandlerAsync(request, response as unknown as Response);
      assert.isTrue((response.status as SinonSpy).calledWith(200));
      assert.isTrue(
        (response.setHeader as SinonSpy).calledWith("Content-Type", "application/octet-stream"),
      );
      assert.isTrue(
        (response.setHeader as SinonSpy).calledWith(
          "Content-Disposition",
          `attachment; filename=${tempFileName}`,
        ),
      );
      assert.isTrue(
        (response.setHeader as SinonSpy).calledWith(
          "Content-Length",
          fs.statSync(tempFilePath).size.toString(),
        ),
      );

      // Cleanup
      fs.unlinkSync(tempFilePath);
      fs.rmdirSync(tempDir);
      sinon.restore();
    });

    it("should return 400 if fileName is not provided", async () => {
      const response = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub().returnsThis(),
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const request = {
        params: {},
        app: {
          get: (_dependency: string) => logger,
        },
      } as unknown as Request;

      await systemBackupDownloadHandlerAsync(request, response as unknown as Response);
      assert.isTrue((response.status as SinonSpy).calledWith(400));
      assert.isTrue((response.json as SinonSpy).calledOnce);
      assert.equal(
        (response.json as SinonSpy).calledWithExactly({
          statusCode: 400,
          error: {
            name: "Bad Request",
            url: request.originalUrl,
            details: ["Backup file name is required"],
          },
          ...response.locals["defaultProperties"],
        }),
        true,
      );
    });

    it("should return 404 if backup file does not exist", async () => {
      const response = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub().returnsThis(),
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const request = {
        params: { fileName: "non-existing-file-lol" },
        originalUrl: "/api/v2/system/backups/non-existing-file-lol",
        app: {
          get: (_dependency: string) => logger,
        },
      } as unknown as Request;

      await systemBackupDownloadHandlerAsync(request, response as unknown as Response);
      assert.isTrue((response.status as SinonSpy).calledWith(404));
      assert.isTrue((response.json as SinonSpy).calledOnce);
      assert.equal(
        (response.json as SinonSpy).calledWith({
          statusCode: 404,
          error: {
            name: "Not Found",
            url: request.originalUrl,
            details: ["Backup file 'non-existing-file-lol' not found"],
          },
          ...response.locals["defaultProperties"],
        }),
        true,
      );
    });
  });

  describe("systemBackupRestoreHandlerAsync", () => {
    it("should return a 202 when restore is initiated", async () => {
      const sprootDBMock = {
        validateBackupArchiveAsync: sinon.stub().resolves(),
      };
      const response = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const requestStream = new PassThrough();
      requestStream.end(Buffer.from("test backup data"));
      const request = Object.assign(requestStream, {
        params: { fileName: "test-backup-file.sproot" },
        app: {
          get: (dependency: string) => {
            if (dependency === "gracefulHaltAsync") {
              return (_fn: () => Promise<void>) => {
                return;
              };
            }

            if (dependency === "logger") {
              return logger;
            }

            return sprootDBMock;
          },
        },
      }) as unknown as Request;
      const result = (await systemBackupRestoreHandlerAsync(request, response)) as SuccessResponse;

      assert.equal(result.statusCode, 202);
      assert.equal(result.timestamp, response.locals["defaultProperties"]["timestamp"]);
      assert.equal(result.requestId, response.locals["defaultProperties"]["requestId"]);
      assert.isTrue(sprootDBMock.validateBackupArchiveAsync.calledOnce);
    });

    it("should return a 400 for invalid backup content", async () => {
      const sprootDBMock = {
        validateBackupArchiveAsync: sinon.stub().rejects(new Error("pg_restore exited with 1")),
      };
      const gracefulHaltSpy = sinon.spy();
      const response = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const requestStream = new PassThrough();
      requestStream.end(Buffer.from("INVALID DATA!"));
      const request = Object.assign(requestStream, {
        params: { fileName: "invalid-backup-file" },
        originalUrl: "/api/v2/system/backups/restore",
        app: {
          get: (dependency: string) => {
            if (dependency === "gracefulHaltAsync") {
              return async (_fn: () => Promise<void>) => {
                gracefulHaltSpy();
                return Promise.resolve();
              };
            }

            if (dependency === "logger") {
              return logger;
            }

            return sprootDBMock;
          },
        },
      }) as unknown as Request;
      const result = (await systemBackupRestoreHandlerAsync(request, response)) as SuccessResponse;

      assert.equal(result.statusCode, 400);
      assert.equal(result.timestamp, response.locals["defaultProperties"]["timestamp"]);
      assert.equal(result.requestId, response.locals["defaultProperties"]["requestId"]);
      assert.isTrue(sprootDBMock.validateBackupArchiveAsync.calledOnce);
      assert.isTrue(gracefulHaltSpy.notCalled);
    });

    it("should invoke the restore after shutdown with a validated backup", async () => {
      const sprootDBMock = {
        validateBackupArchiveAsync: sinon.stub().resolves(),
        swapRestoreDatabaseAsync: sinon.stub().resolves(),
      };
      const response = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const requestStream = new PassThrough();
      requestStream.end(Buffer.from("VALID BACKUP DATA"));
      const request = Object.assign(requestStream, {
        params: { fileName: "invalid-backup-file" },
        app: {
          get: (dependency: string) => {
            if (dependency === "gracefulHaltAsync") {
              return (fn: () => Promise<void>) => {
                void fn();
              };
            }
            if (dependency === "logger") {
              return logger;
            }
            return sprootDBMock;
          },
        },
      }) as unknown as Request;
      const result = (await systemBackupRestoreHandlerAsync(request, response)) as SuccessResponse;
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(result.statusCode, 202);
      assert.equal(result.timestamp, response.locals["defaultProperties"]["timestamp"]);
      assert.equal(result.requestId, response.locals["defaultProperties"]["requestId"]);
      assert.isTrue(sprootDBMock.validateBackupArchiveAsync.calledOnce);
      assert.isTrue(sprootDBMock.swapRestoreDatabaseAsync.calledOnce);
    });

    it("should return a 500 if an exception occurs during restore", async () => {
      const requestStream = Readable.from(
        (async function* () {
          throw new Error("SOMETHING BROKE");
        })(),
      );
      const response = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const request = Object.assign(requestStream, {
        params: { fileName: "test-backup-file.sproot" },
        app: {
          get: (_dependency: string) => {
            // return an async function that accepts a function to run (graceful halt)
            return async (_fn: () => Promise<void>) => {
              return Promise.reject();
            };
          },
        },
      }) as unknown as Request;
      const result = (await systemBackupRestoreHandlerAsync(request, response)) as SuccessResponse;
      assert.equal(result.statusCode, 500);
      assert.equal(result.timestamp, response.locals["defaultProperties"]["timestamp"]);
      assert.equal(result.requestId, response.locals["defaultProperties"]["requestId"]);
    });
  });

  describe("systemBackupCreateHandlerAsync", () => {
    it("should return 202 when backup creation is initiated", async () => {
      const sprootDBMock = {
        backupDatabaseAsync: sinon.stub().resolves(),
      };
      const response = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const request = {
        app: {
          get: (_dependency: string) => sprootDBMock,
        },
      } as unknown as Request;
      const result = (await systemBackupCreateHandlerAsync(request, response)) as SuccessResponse;
      assert.equal(result.statusCode, 202);
      assert.equal(result.timestamp, response.locals["defaultProperties"]["timestamp"]);
      assert.equal(result.requestId, response.locals["defaultProperties"]["requestId"]);
    });
  });

  describe("systemBackupCreateStatusHandlerAsync", () => {
    it("should return a 200 and backup not in progress", async () => {
      const response = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const result = (await systemBackupCreateStatusHandlerAsync(response)) as SuccessResponse;
      assert.equal(result.statusCode, 200);

      assert.equal(result.timestamp, response.locals["defaultProperties"]["timestamp"]);
      assert.equal(result.requestId, response.locals["defaultProperties"]["requestId"]);
      assert.equal(result.content!.data.isGeneratingBackup!, false);
    });
  });
});
