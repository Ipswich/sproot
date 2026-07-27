/* eslint-disable @typescript-eslint/no-unused-vars */
import { SDBAutomation } from "@sproot/common/src/database/SDBAutomation";
import { AutomationOperator } from "@sproot/common/src/automation/IAutomation";
import { IOutputActionsRepository } from "./actions/IOutputActionsRepository";
import { INotificationActionsRepository } from "./actions/INotificationActionsRepository";
import type { IConditionsRepository } from "./conditions/IConditionsRepository";

export interface IAutomationsRepository {
  getAllAsync(): Promise<SDBAutomation[]>;
  getByIdAsync(automationId: number): Promise<SDBAutomation[]>;
  addAsync(name: string, operator: AutomationOperator): Promise<number>;
  updateAsync(
    name: string,
    operator: AutomationOperator,
    id: number,
    enabled: boolean,
  ): Promise<void>;
  deleteAsync(automationId: number): Promise<void>;
  actions: {
    output: IOutputActionsRepository;
    notification: INotificationActionsRepository;
  };
  conditions: IConditionsRepository;
}
