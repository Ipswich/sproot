export const DI_KEYS = {
  // Services
  SprootDB: "sprootDB",
  EventBus: "eventBus",
  SensorList: "sensorList",
  OutputList: "outputList",
  CameraManager: "cameraManager",
  AutomationService: "automationService",
  JournalService: "journalService",
  SystemStatusMonitor: "systemStatusMonitor",
  MdnsService: "mdnsService",
  NotificationActionManager: "notificationActionManager",
  LogHistoryService: "logHistoryService",

  // Infrastructure
  KnexConnection: "knexConnection",
  Logger: "logger",

  // Cron Jobs
  AutomationsCronJob: "automationsCronJob",
  DatabaseUpdateCronJob: "updateDatabaseCronJob",
  BackupCronJob: "backupCronJob",
} as const;
