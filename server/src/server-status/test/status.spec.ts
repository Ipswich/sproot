import * as assert from "assert";
import sinon from "sinon";
import { ServerStatusMonitor } from "../status";

describe("ServerStatsManager", () => {
  let sprootDBMock: any;

  beforeEach(() => {
    sprootDBMock = {
      getDatabaseSizeAsync: sinon.stub().resolves(12345),
    };
  });

  it("should return stats with correct properties", async () => {
    const manager = new ServerStatusMonitor(sprootDBMock);
    const stats = await manager.getStatsAsync();

    assert.strictEqual(typeof stats.uptime, "number");
    assert.strictEqual(typeof stats.memoryUsage, "number");
    assert.strictEqual(typeof stats.cpuUsage, "number");
    assert.strictEqual(stats.databaseSize, 12345);
  });

  it("should call getDatabaseSizeAsync", async () => {
    const manager = new ServerStatusMonitor(sprootDBMock);
    await manager.getStatsAsync();
    assert.strictEqual(sprootDBMock.getDatabaseSizeAsync.calledOnce, true);
  });
});
