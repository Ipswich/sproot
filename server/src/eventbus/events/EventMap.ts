import { Events } from "./Events";
import { NotificationActionsModifiedPayload } from "./actions/NotificationActionsModifiedEvent";
import { OutputActionsModifiedPayload } from "./actions/OutputActionsModifiedEvent";
import { AutomationsTriggeredPayload } from "./automations/AutomationsTriggeredEvent";
import { CameraSettingsModifiedPayload } from "./camera/CameraSettingsModifiedEvent";
import { OutputModifiedPayload } from "./outputs/OutputModifiedEvent";
import { SensorModifiedPayload } from "./sensors/SensorModifiedEvent";

export interface EventMap {
  [Events.AUTOMATIONS_TRIGGERED_EVENT]: AutomationsTriggeredPayload;
  [Events.OUTPUT_ACTION_MODIFIED_EVENT]: OutputActionsModifiedPayload;
  [Events.NOTIFICATION_ACTION_MODIFIED_EVENT]: NotificationActionsModifiedPayload;
  [Events.SENSOR_MODIFIED_EVENT]: SensorModifiedPayload;
  [Events.OUTPUT_MODIFIED_EVENT]: OutputModifiedPayload;
  [Events.CAMERA_SETTINGS_MODIFIED_EVENT]: CameraSettingsModifiedPayload;
}
