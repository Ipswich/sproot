import os from "os";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";

export class ServerStatusMonitor {
  #cpuMonitor: CpuMonitor = new CpuMonitor(1000, 5);
  #sprootDB: ISprootDB;

  constructor(sprootDB: ISprootDB) {
    this.#sprootDB = sprootDB;
  }

  async getStatsAsync() {
    return {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage.rss() / 1024 / 1024,
      cpuUsage: this.#cpuMonitor.getAverageUsage(),
      databaseSize: await this.#sprootDB.getDatabaseSizeAsync(),

      // timelapseDirectorySize: this.timelapseDirectorySize,
      // lastArchiveDuration: this.lastArchiveDuration,
    };
  }
}

class CpuMonitor {
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
    setInterval(() => {
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
}
