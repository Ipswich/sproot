export type SystemStatus = {
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
  databaseSize: number;
  totalDiskSize: number;
  freeDiskSize: number;
  // timelapseDirectorySize?: number; // in MB, optional
  // lastArchiveDuration?: number; // in seconds, optional
};
