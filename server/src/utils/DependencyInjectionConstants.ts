export const DI_KEYS = {
  // Services
  SprootDB: "sprootDB",
  SensorList: "sensorList",
  OutputList: "outputList",
  CameraManager: "cameraManager",
  AutomationDataManager: "automationDataManager",
  JournalService: "journalService",
  SystemStatusMonitor: "systemStatusMonitor",
  MdnsService: "mdnsService",

  // Infrastructure
  KnexConnection: "knexConnection",
  Logger: "logger",

  // Cron Jobs
  UpdateDevicesCronJob: "updateDevicesCronJob",
  AutomationsCronJob: "automationsCronJob",
  DatabaseUpdateCronJob: "updateDatabaseCronJob",
  BackupCronJob: "backupCronJob",
} as const;
