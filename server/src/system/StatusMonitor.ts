import os from "os";
import { statfs } from "fs";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB.js";
import { promisify } from "util";
import { SystemStatus } from "@sproot/sproot-common/dist/system/SystemStatus.js";
import { CameraManager } from "../camera/CameraManager.js";
import { Knex } from "knex";

const statfsAsync = promisify(statfs);

export class SystemStatusMonitor implements Disposable {
  #cpuMonitor: CpuMonitor = new CpuMonitor(1000, 5);
  #cameraManager: CameraManager;
  #sprootDB: ISprootDB;
  #knexConnection: Knex;

  constructor(cameraManager: CameraManager, sprootDB: ISprootDB, knexConnection: Knex) {
    this.#cameraManager = cameraManager;
    this.#sprootDB = sprootDB;
    this.#knexConnection = knexConnection;
  }

  async getStatusAsync(): Promise<SystemStatus> {
    const fileStats = await statfsAsync("/");
    const pool = (this.#knexConnection.client as Knex.Client).pool!;
    return {
      system: {
        totalDiskSize: (fileStats.blocks * fileStats.bsize) / 1024 / 1024,
        freeDiskSize: (fileStats.bavail * fileStats.bsize) / 1024 / 1024,
      },
      process: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage().rss / 1024 / 1024,
        heapUsage: process.memoryUsage().heapUsed / 1024 / 1024,
        cpuUsage: this.#cpuMonitor.getAverageUsage(),
      },
      database: {
        size: await this.#sprootDB.getDatabaseSizeAsync(),
        connectionsUsed: pool.numUsed(),
        connectionsFree: pool.numFree(),
        pendingAcquires: pool.numPendingAcquires(),
        pendingCreates: pool.numPendingCreates(),
      },
      timelapse: {
        imageCount: this.#cameraManager.getTimelapseImageCount(),
        directorySize: await this.#cameraManager.getTimelapseArchiveSizeAsync(),
        lastArchiveGenerationDuration: this.#cameraManager.getLastTimelapseGenerationDuration(),
      },
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
    // Get CPU usage for just this process and its children
    // process.cpuUsage() returns user/system microseconds for this process
    // We need to convert to milliseconds and estimate percent usage

    const cpuUsage = process.cpuUsage();
    const userMs = cpuUsage.user / 1000;
    const systemMs = cpuUsage.system / 1000;
    const totalProcessMs = userMs + systemMs;

    // Get elapsed time since process started
    const uptimeMs = process.uptime() * 1000;

    // Get number of CPUs
    const numCpus = os.cpus().length;

    // Total available CPU time (ms) for all cores
    const totalAvailableMs = uptimeMs * numCpus;

    // Usage percent for this process and its children
    const usagePercent = totalAvailableMs > 0 ? (totalProcessMs / totalAvailableMs) * 100 : 0;

    // For compatibility with previous code, return "idle" and "total"
    // Here, "idle" is the unused portion, "total" is totalAvailableMs
    return {
      idle: totalAvailableMs - totalProcessMs,
      total: totalAvailableMs,
      usagePercent,
    };
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
