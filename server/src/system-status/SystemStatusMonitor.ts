import os from "os";
import { statfs } from "fs";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { promisify } from "util";
import { SystemStatus } from "@sproot/sproot-common/dist/system/SystemStatus";

const statfsAsync = promisify(statfs);

export class SystemStatusMonitor {
  #cpuMonitor: CpuMonitor = new CpuMonitor(1000, 5);
  #sprootDB: ISprootDB;

  constructor(sprootDB: ISprootDB) {
    this.#sprootDB = sprootDB;
  }

  async getStatsAsync(): Promise<SystemStatus> {
    const fileStats = await statfsAsync("/");
    return {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage.rss() / 1024 / 1024,
      cpuUsage: this.#cpuMonitor.getAverageUsage(),
      databaseSize: await this.#sprootDB.getDatabaseSizeAsync(),
      totalDiskSize: (fileStats.blocks * fileStats.bsize) / 1024 / 1024,
      freeDiskSize: (fileStats.bavail * fileStats.bsize) / 1024 / 1024,
      // timelapseDirectorySize: this.timelapseDirectorySize,
      // lastArchiveDuration: this.lastArchiveDuration,
    };
  }

  [Symbol.dispose]() {
    this.#cpuMonitor[Symbol.dispose]();
  }
}

class CpuMonitor {
  #timeout: NodeJS.Timeout | null = null;
  #sampleIntervalMs: number;
  #historySize: number;
  #usageHistory: number[] = [];
  #previousTimes: { idle: number; total: number };

  constructor(sampleIntervalMs = 1000, historySeconds = 5) {
    this.#sampleIntervalMs = sampleIntervalMs;
    this.#historySize = Math.ceil((historySeconds * 1000) / sampleIntervalMs);
    this.#usageHistory = [];
    this.#previousTimes = this.#getCpuTimes();

    this.#startSampling();
  }

  getAverageUsage() {
    if (this.#usageHistory.length === 0) return 0;
    const sum = this.#usageHistory.reduce((a, b) => a + b, 0);
    return sum / this.#usageHistory.length;
  }

  #getCpuTimes() {
    const cpus = os.cpus();

    let idle = 0;
    let total = 0;

    for (const cpu of cpus) {
      for (const [type, value] of Object.entries(cpu.times)) {
        total += value;
        if (type === "idle") idle += value;
      }
    }

    return { idle, total };
  }

  #startSampling() {
    this.#timeout = setInterval(() => {
      const currentTimes = this.#getCpuTimes();
      const idleDiff = currentTimes.idle - this.#previousTimes.idle;
      const totalDiff = currentTimes.total - this.#previousTimes.total;

      const usagePercent = totalDiff > 0 ? 100 - (idleDiff / totalDiff) * 100 : 0;

      this.#usageHistory.push(usagePercent);
      if (this.#usageHistory.length > this.#historySize) {
        this.#usageHistory.shift();
      }

      this.#previousTimes = currentTimes;
    }, this.#sampleIntervalMs);
  }

  [Symbol.dispose]() {
    if (this.#timeout) {
      clearInterval(this.#timeout);
      this.#timeout = null;
    }
  }
}
