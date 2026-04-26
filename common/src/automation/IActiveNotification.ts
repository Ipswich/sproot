import { IAutomationEventPayload } from "./IAutomationEventPayload";

export interface IActiveNotification {
  notificationId: number;
  subject: string;
  content: string;
  payload: IAutomationEventPayload;
}
