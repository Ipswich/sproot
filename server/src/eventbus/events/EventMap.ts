import { Events } from "./Events";
import { NotificationActionsModifiedPayload } from "./actions/NotificationActionsModifiedEvent";
import { OutputActionsModifiedPayload } from "./actions/OutputActionsModifiedEvent";
import { AutomationsTriggeredPayload } from "./automations/AutomationsTriggeredEvent";
import { CameraSettingsModifiedPayload } from "./camera/CameraSettingsModifiedEvent";
import { OutputModifiedPayload } from "./outputs/OutputModifiedEvent";
import { SensorModifiedPayload } from "./sensors/SensorModifiedEvent";
import { LogEventPayload } from "./logging/LogEvent";
import { SensorRetentionUpdatedPayload } from "./retention/SensorRetentionUpdatedEvent";
import { OutputRetentionUpdatedPayload } from "./retention/OutputRetentionUpdatedEvent";
import { BackupRetentionUpdatedPayload } from "./retention/BackupRetentionUpdatedEvent";

export interface EventMap {
  [Events.AUTOMATIONS_TRIGGERED_EVENT]: AutomationsTriggeredPayload;
  [Events.OUTPUT_ACTION_MODIFIED_EVENT]: OutputActionsModifiedPayload;
  [Events.NOTIFICATION_ACTION_MODIFIED_EVENT]: NotificationActionsModifiedPayload;
  [Events.SENSOR_MODIFIED_EVENT]: SensorModifiedPayload;
  [Events.OUTPUT_MODIFIED_EVENT]: OutputModifiedPayload;
  [Events.CAMERA_SETTINGS_MODIFIED_EVENT]: CameraSettingsModifiedPayload;
  [Events.LOG_EVENT]: LogEventPayload;
  [Events.SENSOR_RETENTION_UPDATED]: SensorRetentionUpdatedPayload;
  [Events.OUTPUT_RETENTION_UPDATED]: OutputRetentionUpdatedPayload;
  [Events.BACKUP_RETENTION_UPDATED]: BackupRetentionUpdatedPayload;
}
