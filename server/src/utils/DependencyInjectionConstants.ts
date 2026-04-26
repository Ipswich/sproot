export const DI_KEYS = {
  // Services
  SprootDB: "sprootDB",
  SensorList: "sensorList",
  OutputList: "outputList",
  CameraManager: "cameraManager",
  AutomationService: "automationService",
  JournalService: "journalService",
  SystemStatusMonitor: "systemStatusMonitor",
  MdnsService: "mdnsService",
  NotificationActionManager: "notificationActionManager",

  // Infrastructure
  KnexConnection: "knexConnection",
  Logger: "logger",

  // Cron Jobs
  UpdateDevicesCronJob: "updateDevicesCronJob",
  AutomationsCronJob: "automationsCronJob",
  DatabaseUpdateCronJob: "updateDatabaseCronJob",
  BackupCronJob: "backupCronJob",
} as const;
