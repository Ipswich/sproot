import { IActiveNotification } from "./IActiveNotification";

export interface IActiveNotificationsResponse {
  lastRunAt: number;
  notifications: IActiveNotification[];
}
