import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";

export class ServerStatsManager {
  #sprootDB: ISprootDB;

  constructor(sprootDB: ISprootDB) {
    this.#sprootDB = sprootDB;
  }

  async getStatsAsync() {
    return {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage.rss() / 1024 / 1024,
      cpuUsage: process.cpuUsage().system, // Needs more math to get a percentage
      databaseSize: await this.#sprootDB.getDatabaseSizeAsync(),

      // timelapseDirectorySize: this.timelapseDirectorySize,
      // lastArchiveDuration: this.lastArchiveDuration,
    };
  }

  // #getCpuUsagePercentageOfLastMinute() {
  // }
}
