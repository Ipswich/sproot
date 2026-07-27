import { SDBNotificationAction } from "@sproot/common/database/SDBNotificationAction";
import { IActionBaseRepository } from "../conditions/IBaseConditionsRepository";

export interface INotificationActionsRepository extends IActionBaseRepository<SDBNotificationAction> {
  getAllAsync(): Promise<SDBNotificationAction[]>;
  getAsync(automationId: number): Promise<SDBNotificationAction[]>;
  addAsync(automationId: number, subject: string, content: string): Promise<number>;
  getNotificationActionByIdAsync(actionId: number): Promise<SDBNotificationAction[]>;
  updateAsync(automationId: number, action: SDBNotificationAction): Promise<void>;
}
