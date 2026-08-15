import { assert } from "chai";
import sinon from "sinon";
import { SystemStatusMonitor } from "../StatusMonitor";
import { CameraManager } from "../../camera/CameraManager";
import ImageCapture from "../../camera/ImageCapture";
import winston from "winston";
import { MemoryEventBus } from "../../eventbus/MemoryEventBus";

describe("ServerStatsManager", () => {
  const eventBus = new MemoryEventBus(
    winston.createLogger({ transports: [new winston.transports.Console({ silent: true })] }),
  );
  let sprootDBMock: any;
  let systemRepoMock: any;
  let knexConnectionMock: any;

  beforeEach(() => {
    sprootDBMock = {
      system: {
        getDatabaseSizeAsync: sinon.stub().resolves(12345),
      },
      camera: {
        getAllAsync: sinon.stub().resolves([]),
        getByIdAsync: sinon.stub().resolves(null),
        addAsync: sinon.stub().resolves(1),
        updateAsync: sinon.stub().resolves(),
        deleteAsync: sinon.stub().resolves(),
      },
    };
    systemRepoMock = {
      getDatabaseSizeAsync: sinon.stub().resolves(12345),
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

  it("returns stats with correct properties", async () => {
    sinon.stub(ImageCapture.prototype, "getTimelapseArchiveSizeAsync").resolves(0);

    await using manager = await CameraManager.createInstanceAsync(
      eventBus,
      sprootDBMock.camera,
      winston.createLogger({
        transports: [new winston.transports.Console({ silent: true })],
      }),
    );
    await manager.regenerateAsync();
    using monitor = new SystemStatusMonitor(manager, systemRepoMock, knexConnectionMock);
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
    assert.isAtMost(stats.timelapse.directorySize ?? 0, 0.001);
    assert.strictEqual(stats.timelapse.lastArchiveGenerationDuration, null);
  });

  it("calls getDatabaseSizeAsync", async () => {
    await using manager = await CameraManager.createInstanceAsync(
      eventBus,
      sprootDBMock.camera,
      winston.createLogger({
        transports: [new winston.transports.Console({ silent: true })],
      }),
    );
    await manager.regenerateAsync();
    using monitor = new SystemStatusMonitor(manager, systemRepoMock, knexConnectionMock);
    await monitor.getStatusAsync();
    assert.strictEqual(systemRepoMock.getDatabaseSizeAsync.calledOnce, true);
  });
});
