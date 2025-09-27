import * as assert from "assert";
import sinon from "sinon";
import { SystemStatusMonitor } from "../StatusMonitor";
import { CameraManager } from "../../camera/CameraManager";
import winston from "winston";

describe("ServerStatsManager", () => {
  let sprootDBMock: any;

  beforeEach(() => {
    sprootDBMock = {
      getDatabaseSizeAsync: sinon.stub().resolves(12345),
      getCameraSettingsAsync: sinon.stub().resolves([]),
    };
  });

  it("should return stats with correct properties", async () => {
    const manager = new CameraManager(
      sprootDBMock,
      "test_key",
      winston.createLogger({
        transports: [new winston.transports.Console({ silent: true })],
      }),
    );
    await manager.initializeOrRegenerateAsync();
    using monitor = new SystemStatusMonitor(manager, sprootDBMock);
    const stats = await monitor.getStatusAsync();

    assert.strictEqual(typeof stats.uptime, "number");
    assert.strictEqual(typeof stats.memoryUsage, "number");
    assert.strictEqual(typeof stats.heapUsage, "number");
    assert.strictEqual(typeof stats.cpuUsage, "number");
    assert.strictEqual(stats.databaseSize, 12345);
    assert.strictEqual(typeof stats.totalDiskSize, "number");
    assert.strictEqual(typeof stats.freeDiskSize, "number");
    assert.strictEqual(stats.timelapseDirectorySize, null);
    assert.strictEqual(stats.lastTimelapseGenerationDuration, null);

    manager.dispose();
  });

  it("should call getDatabaseSizeAsync", async () => {
    const manager = new CameraManager(
      sprootDBMock,
      "test_key",
      winston.createLogger({
        transports: [new winston.transports.Console({ silent: true })],
      }),
    );
    await manager.initializeOrRegenerateAsync();
    using monitor = new SystemStatusMonitor(manager, sprootDBMock);
    await monitor.getStatusAsync();
    assert.strictEqual(sprootDBMock.getDatabaseSizeAsync.calledOnce, true);

    manager.dispose();
  });
});
