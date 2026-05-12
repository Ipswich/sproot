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
      const tempFileName = "test-backup-file.sproot.gz";
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
      const response = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const request = {
        params: { fileName: "test-backup-file.sproot.gz" },
        // Add stream event handlers so piping to this mocked response works
        on: sinon.stub().returnsThis(),
        once: sinon.stub().returnsThis(),
        emit: sinon.stub().returnsThis(),
        write: sinon.stub().returnsThis(),
        end: sinon.stub().returnsThis(),
        error: sinon.stub().returnsThis(),
        pipe: sinon.stub().callsFake((dest: any) => {
          if (typeof dest.write === "function")
            dest.write(Buffer.from(Uint8Array.from([0x1f, 0x8b, 0x08, 0x00]))); // gzip header
          if (typeof dest.end === "function") dest.end();
          setImmediate(() => {
            if (typeof dest.emit === "function") dest.emit("finish");
          });
          return dest;
        }),
        app: {
          get: (_dependency: string) => {
            return async (_fn: () => Promise<void>) => {
              return Promise.resolve();
            };
          },
        },
      } as unknown as Request;
      const result = (await systemBackupRestoreHandlerAsync(request, response)) as SuccessResponse;

      assert.equal(result.statusCode, 202);
      assert.equal(result.timestamp, response.locals["defaultProperties"]["timestamp"]);
      assert.equal(result.requestId, response.locals["defaultProperties"]["requestId"]);
    });

    it("should return a 400 with an invalid backup file", async () => {
      const sprootDBMock = {
        restoreDatabaseAsync: sinon.stub().resolves(false),
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
        params: { fileName: "invalid-backup-file" },
        // Add stream event handlers so piping to this mocked response works
        on: sinon.stub().returnsThis(),
        once: sinon.stub().returnsThis(),
        emit: sinon.stub().returnsThis(),
        write: sinon.stub().returnsThis(),
        end: sinon.stub().returnsThis(),
        error: sinon.stub().returnsThis(),
        pipe: sinon.stub().callsFake((dest: any) => {
          if (typeof dest.write === "function") dest.write(Buffer.from("INVALID DATA!"));
          if (typeof dest.end === "function") dest.end();
          setImmediate(() => {
            if (typeof dest.emit === "function") dest.emit("finish");
          });
          return dest;
        }),
        app: {
          get: (_dependency: string) => sprootDBMock,
        },
      } as unknown as Request;
      const result = (await systemBackupRestoreHandlerAsync(request, response)) as SuccessResponse;
      assert.equal(result.statusCode, 400);
      assert.equal(result.timestamp, response.locals["defaultProperties"]["timestamp"]);
      assert.equal(result.requestId, response.locals["defaultProperties"]["requestId"]);
    });

    it("should return a 500 if an exception occurs during restore", async () => {
      const response = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const request = {
        params: { fileName: "test-backup-file.sproot.gz" },
        // Add stream event handlers so piping to this mocked response works
        on: sinon.stub().returnsThis(),
        once: sinon.stub().returnsThis(),
        emit: sinon.stub().returnsThis(),
        write: sinon.stub().returnsThis(),
        end: sinon.stub().returnsThis(),
        error: sinon.stub().returnsThis(),
        pipe: sinon.stub().callsFake((dest: any) => {
          if (typeof dest.write === "function")
            dest.write(Buffer.from(Uint8Array.from([0x1f, 0x8b, 0x08, 0x00]))); // gzip header
          if (typeof dest.end === "function") dest.end();
          setImmediate(() => {
            if (typeof dest.emit === "function") dest.emit("error", "SOMETHING BROKE");
          });
          return dest;
        }),
        app: {
          get: (_dependency: string) => {
            // return an async function that accepts a function to run (graceful halt)
            return async (_fn: () => Promise<void>) => {
              return Promise.reject();
            };
          },
        },
      } as unknown as Request;
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
