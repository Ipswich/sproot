import { Events } from "./Events";
import {
  NotificationActionDeletedPayload,
  NotificationActionAddedPayload,
} from "./actions/NotificationActionEvents";
import { OutputActionDeletedPayload, OutputActionAddedPayload } from "./actions/OutputActionEvents";
import { AutomationsTriggeredPayload } from "./automations/AutomationsTriggeredEvent";
import { CameraSettingsModifiedPayload } from "./camera/CameraSettingsModifiedEvent";
import { OutputModifiedPayload } from "./outputs/OutputModifiedEvent";
import { SensorModifiedPayload } from "./sensors/SensorModifiedEvent";
import { LogEventPayload } from "./logging/LogEvent";
import { SettingUpdatedPayload } from "./settings/SettingUpdatedPayload";
import { SETTINGS } from "../../database/settings/SettingsSchema";

export interface EventMap {
  [Events.AUTOMATIONS_TRIGGERED_EVENT]: AutomationsTriggeredPayload;
  [Events.OUTPUT_ACTION_ADDED_EVENT]: OutputActionAddedPayload;
  [Events.OUTPUT_ACTION_DELETED_EVENT]: OutputActionDeletedPayload;
  [Events.NOTIFICATION_ACTION_ADDED_EVENT]: NotificationActionAddedPayload;
  [Events.NOTIFICATION_ACTION_DELETED_EVENT]: NotificationActionDeletedPayload;
  [Events.SENSOR_MODIFIED_EVENT]: SensorModifiedPayload;
  [Events.OUTPUT_MODIFIED_EVENT]: OutputModifiedPayload;
  [Events.CAMERA_SETTINGS_MODIFIED_EVENT]: CameraSettingsModifiedPayload;
  [Events.LOG_EVENT]: LogEventPayload;
  [Events.SENSOR_RETENTION_UPDATED]: SettingUpdatedPayload<typeof SETTINGS.sensors.data_retention>;
  [Events.OUTPUT_RETENTION_UPDATED]: SettingUpdatedPayload<typeof SETTINGS.outputs.data_retention>;
  [Events.BACKUP_RETENTION_UPDATED]: SettingUpdatedPayload<typeof SETTINGS.system.backup_retention>;
  [Events.SYSTEM_LOG_DEBUG_UPDATED]: SettingUpdatedPayload<typeof SETTINGS.system.log_debug>;
  [Events.SYSTEM_LATITUDE_UPDATED]: SettingUpdatedPayload<typeof SETTINGS.system.latitude>;
  [Events.SYSTEM_LONGITUDE_UPDATED]: SettingUpdatedPayload<typeof SETTINGS.system.longitude>;
}
