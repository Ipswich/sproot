import { assert } from "chai";
import sinon from "sinon";
import { SystemStatusMonitor } from "../StatusMonitor";
import { CameraManager } from "../../camera/CameraManager";
import winston from "winston";

describe("ServerStatsManager", () => {
  let sprootDBMock: any;
  let knexConnectionMock: any;

  beforeEach(() => {
    sprootDBMock = {
      getDatabaseSizeAsync: sinon.stub().resolves(12345),
      getCameraSettingsAsync: sinon.stub().resolves([]),
    };
    knexConnectionMock = {
      client: {
        pool: {
          numUsed: sinon.stub().returns(1),
          numFree: sinon.stub().returns(2),
          numPendingAcquires: sinon.stub().returns(0),
          numPendingCreates: sinon.stub().returns(0),
        },
      },
    };
  });

  it("should return stats with correct properties", async () => {
    await using manager = new CameraManager(
      sprootDBMock,
      "test_key",
      winston.createLogger({
        transports: [new winston.transports.Console({ silent: true })],
      }),
    );
    await manager.initializeOrRegenerateAsync();
    using monitor = new SystemStatusMonitor(manager, sprootDBMock, knexConnectionMock);
    const stats = await monitor.getStatusAsync();

    assert.strictEqual(typeof stats.process.uptime, "number");
    assert.strictEqual(typeof stats.process.memoryUsage, "number");
    assert.strictEqual(typeof stats.process.heapUsage, "number");
    assert.strictEqual(typeof stats.process.cpuUsage, "number");
    assert.strictEqual(stats.database.size, 12345);
    assert.strictEqual(typeof stats.database.connectionsUsed, "number");
    assert.strictEqual(typeof stats.database.connectionsFree, "number");
    assert.strictEqual(typeof stats.database.pendingAcquires, "number");
    assert.strictEqual(typeof stats.database.pendingCreates, "number");
    assert.strictEqual(typeof stats.system.totalDiskSize, "number");
    assert.strictEqual(typeof stats.system.freeDiskSize, "number");
    assert.strictEqual(stats.timelapse.imageCount, 0);
    assert.strictEqual(stats.timelapse.directorySize, null);
    assert.strictEqual(stats.timelapse.lastArchiveGenerationDuration, null);
  });

  it("should call getDatabaseSizeAsync", async () => {
    await using manager = new CameraManager(
      sprootDBMock,
      "test_key",
      winston.createLogger({
        transports: [new winston.transports.Console({ silent: true })],
      }),
    );
    await manager.initializeOrRegenerateAsync();
    using monitor = new SystemStatusMonitor(manager, sprootDBMock, knexConnectionMock);
    await monitor.getStatusAsync();
    assert.strictEqual(sprootDBMock.getDatabaseSizeAsync.calledOnce, true);
  });
});
