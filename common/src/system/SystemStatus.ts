export type SystemStatus = {
  system: {
    totalDiskSize: number;
    freeDiskSize: number;
  };
  process: {
    uptime: number;
    memoryUsage: number;
    heapUsage: number;
    cpuUsage: number;
  };
  database: {
    size: number;
    connectionsUsed: number;
    connectionsFree: number;
    pendingAcquires: number;
    pendingCreates: number;
  };
  timelapse: {
    imageCount: number | null;
    directorySize: number | null; // in MB, optional
    lastArchiveGenerationDuration: number | null; // in seconds
  };
};
