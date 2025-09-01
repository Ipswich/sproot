import * as assert from "assert";
import sinon from "sinon";
import { SystemStatusMonitor } from "../SystemStatusMonitor";

describe("ServerStatsManager", () => {
  let sprootDBMock: any;

  beforeEach(() => {
    sprootDBMock = {
      getDatabaseSizeAsync: sinon.stub().resolves(12345),
    };
  });

  it("should return stats with correct properties", async () => {
    using manager = new SystemStatusMonitor(sprootDBMock);
    const stats = await manager.getStatusAsync();

    assert.strictEqual(typeof stats.uptime, "number");
    assert.strictEqual(typeof stats.memoryUsage, "number");
    assert.strictEqual(typeof stats.heapUsage, "number");
    assert.strictEqual(typeof stats.cpuUsage, "number");
    assert.strictEqual(stats.databaseSize, 12345);
    assert.strictEqual(typeof stats.totalDiskSize, "number");
    assert.strictEqual(typeof stats.freeDiskSize, "number");
  });

  it("should call getDatabaseSizeAsync", async () => {
    using manager = new SystemStatusMonitor(sprootDBMock);
    await manager.getStatusAsync();
    assert.strictEqual(sprootDBMock.getDatabaseSizeAsync.calledOnce, true);
  });
});
