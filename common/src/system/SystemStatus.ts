export type SystemStatus = {
  uptime: number;
  memoryUsage: number;
  heapUsage: number;
  cpuUsage: number;
  databaseSize: number;
  totalDiskSize: number;
  freeDiskSize: number;
  timelapseDirectorySize: number | null; // in MB, optional
  lastTimelapseGenerationDuration: number | null; // in seconds
};
