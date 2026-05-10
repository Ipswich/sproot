import { assert } from "chai";
import request from "supertest";

import { server } from "../../setup";
import { validateMiddlewareValues } from "../../utils";

describe("System Routes", async () => {
  describe("Status", async () => {
    describe("GET", async () => {
      it("should return 200 and system status", async () => {
        let retryCount = 0;
        let timelapseCompletion = await request(server).get("/api/v2/camera/timelapse/archive/status");
        while (timelapseCompletion.body["content"].data.isGenerating && retryCount < 5) {
          try {
            await new Promise((resolve) => setTimeout(resolve, 100));
            timelapseCompletion = await request(server).get("/api/v2/camera/timelapse/archive/status");
          } catch (err) {
            console.error("Error checking timelapse status:", err);
            break;
          }
          retryCount++;
        }
        const response = await request(server).get("/api/v2/system/status").expect(200);
        validateMiddlewareValues(response);

        const data = response.body["content"].data;
        assert.equal(countLeafProperties(data), 14);

        assert.isNumber(data.process.uptime);
        assert.isNumber(data.process.memoryUsage);
        assert.isNumber(data.process.heapUsage);
        assert.isNumber(data.process.cpuUsage);
        assert.isNumber(data.database.size);
        assert.isNumber(data.database.connectionsUsed);
        assert.isNumber(data.database.connectionsFree);
        assert.isNumber(data.database.pendingAcquires);
        assert.isNumber(data.database.pendingCreates);
        assert.isNumber(data.system.totalDiskSize);
        assert.isNumber(data.system.freeDiskSize);
        assert.isNumber(data.timelapse.directorySize);
        assert.isNumber(data.timelapse.lastArchiveGenerationDuration);
      });
    });
  });

  describe("Backups", async () => {
    describe("list", async () => {
      describe("GET", async () => {
        it("should return 200 and a list of backups", async () => {
          const response = await request(server).get("/api/v2/system/backups").expect(200);
          const data = response.body["content"].data;
          validateMiddlewareValues(response);

          assert.isArray(data);
        });
      });
    });

    describe("create", async () => {
      describe("POST", async () => {
        it("should return 202 and queue a backup creation", async () => {
          const response = await request(server).post("/api/v2/system/backups/create").expect(202);
          const data = response.body["content"].data;
          validateMiddlewareValues(response);

          assert.equal(data, "Backup creation queued.");
        });
      });
    });

    describe("status", async () => {
      describe("GET", async () => {
        it("should return 200 and the backup status", async () => {
          const response = await request(server)
            .get("/api/v2/system/backups/create/status")
            .expect(200);
          const data = response.body["content"].data;
          validateMiddlewareValues(response);

          assert.isBoolean(data.isGeneratingBackup);
        });
      });
    });

    describe("download", async () => {
      describe("GET", async () => {
        it("should return 200 and the backup file", async () => {
          let response = await request(server).get("/api/v2/system/backups").expect(200);
          let data = response.body["content"].data;
          validateMiddlewareValues(response);
          assert.isNotEmpty(data);

          response = await request(server)
            .get(`/api/v2/system/backups/download/${data[0]}`)
            .expect(200);
          validateMiddlewareValues(response);

          assert.equal(response.headers["content-type"], "application/octet-stream");
          assert.isString(response.headers["content-length"]);
          assert.isNotNull(response.body);
        });
      });
    });
  });
});

function countLeafProperties(obj: unknown): number {
  if (obj === null) {
    return 1;
  }

  if (typeof obj !== "object") {
    return 1;
  }

  let count = 0;
  for (const key in obj as Record<string, unknown>) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      count += countLeafProperties((obj as Record<string, unknown>)[key]);
    }
  }
  return count;
}