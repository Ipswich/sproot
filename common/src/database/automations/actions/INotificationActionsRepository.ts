/* eslint-disable @typescript-eslint/no-unused-vars */
import { SDBNotificationAction } from "@sproot/common/src/database/SDBNotificationAction";
import { IActionBaseRepository } from "../conditions/IBaseConditionsRepository";

export interface INotificationActionsRepository extends IActionBaseRepository<SDBNotificationAction> {
  getAllAsync(): Promise<SDBNotificationAction[]>;
  getAsync(automationId: number): Promise<SDBNotificationAction[]>;
  addAsync(automationId: number, subject: string, content: string): Promise<number>;
  getNotificationActionByIdAsync(actionId: number): Promise<SDBNotificationAction[]>;
  updateAsync(automationId: number, action: SDBNotificationAction): Promise<void>;
}

export class MockNotificationActionsRepository implements INotificationActionsRepository {
  async getAllAsync(): Promise<SDBNotificationAction[]> {
    return [];
  }
  async getAsync(_automationId: number): Promise<SDBNotificationAction[]> {
    return [];
  }
  async addAsync(_automationId: number, _subject: string, _content: string): Promise<number> {
    return 0;
  }
  async getNotificationActionByIdAsync(_actionId: number): Promise<SDBNotificationAction[]> {
    return [];
  }
  async updateAsync(_automationId: number, _action: SDBNotificationAction): Promise<void> {
    return;
  }
  async deleteAsync(_actionId: number): Promise<void> {
    return;
  }
}
