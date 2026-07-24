/* eslint-disable @typescript-eslint/no-unused-vars */
import { SDBAutomation } from "@sproot/common/src/database/SDBAutomation";
import { SDBOutputActionView } from "@sproot/common/src/database/SDBOutputAction";
import { AutomationOperator } from "@sproot/common/src/automation/IAutomation";
import { IOutputActionsRepository } from "./actions/IOutputActionsRepository";
import { INotificationActionsRepository } from "./actions/INotificationActionsRepository";
import { ISensorConditionsRepository } from "./conditions/ISensorConditionsRepository";
import { IOutputConditionsRepository } from "./conditions/IOutputConditionsRepository";
import { ITimeConditionsRepository } from "./conditions/ITimeConditionsRepository";
import { IWeekdayConditionsRepository } from "./conditions/IWeekdayConditionsRepository";
import { IMonthConditionsRepository } from "./conditions/IMonthConditionsRepository";
import { IDateRangeConditionsRepository } from "./conditions/IDateRangeConditionsRepository";
import { MockOutputActionsRepository } from "./actions/IOutputActionsRepository";
import { MockNotificationActionsRepository } from "./actions/INotificationActionsRepository";
import { MockSensorConditionsRepository } from "./conditions/ISensorConditionsRepository";
import { MockOutputConditionsRepository } from "./conditions/IOutputConditionsRepository";
import { MockTimeConditionsRepository } from "./conditions/ITimeConditionsRepository";
import { MockWeekdayConditionsRepository } from "./conditions/IWeekdayConditionsRepository";
import { MockMonthConditionsRepository } from "./conditions/IMonthConditionsRepository";
import { MockDateRangeConditionsRepository } from "./conditions/IDateRangeConditionsRepository";

export interface IAutomationsRepository {
  getAllAsync(): Promise<SDBAutomation[]>;
  getByIdAsync(automationId: number): Promise<SDBAutomation[]>;
  addAsync(name: string, operator: AutomationOperator): Promise<number>;
  updateAsync(name: string, operator: AutomationOperator, id: number, enabled: boolean): Promise<void>;
  deleteAsync(automationId: number): Promise<void>;

  actions: IActionsRepository;
  conditions: IConditionsRepository;

  getAutomationsForOutputAsync(outputId: number): Promise<SDBOutputActionView[]>;
  deleteSensorAutomationConditionsExceptAsync(
    automationId: number,
    exceptConditionIds: number[],
  ): Promise<void>;
  deleteOutputAutomationConditionsExceptAsync(
    automationId: number,
    exceptConditionIds: number[],
  ): Promise<void>;
}

export type IActionsRepository = {
  output: IOutputActionsRepository;
  notification: INotificationActionsRepository;
};

export type IConditionsRepository = {
  sensor: ISensorConditionsRepository;
  output: IOutputConditionsRepository;
  time: ITimeConditionsRepository;
  weekday: IWeekdayConditionsRepository;
  month: IMonthConditionsRepository;
  dateRange: IDateRangeConditionsRepository;
};

export class MockAutomationsRepository implements IAutomationsRepository {
  actions = {
    output: new MockOutputActionsRepository(),
    notification: new MockNotificationActionsRepository(),
  };
  conditions = {
    sensor: new MockSensorConditionsRepository(),
    output: new MockOutputConditionsRepository(),
    time: new MockTimeConditionsRepository(),
    weekday: new MockWeekdayConditionsRepository(),
    month: new MockMonthConditionsRepository(),
    dateRange: new MockDateRangeConditionsRepository(),
  };

  async getAllAsync(): Promise<SDBAutomation[]> { return []; }
  async getByIdAsync(_automationId: number): Promise<SDBAutomation[]> { return []; }
  async addAsync(_name: string, _operator: AutomationOperator): Promise<number> { return 0; }
  async updateAsync(_name: string, _operator: AutomationOperator, _id: number, _enabled: boolean): Promise<void> { return; }
  async deleteAsync(_automationId: number): Promise<void> { return; }
  async getAutomationsForOutputAsync(_outputId: number): Promise<SDBOutputActionView[]> { return []; }
  async deleteSensorAutomationConditionsExceptAsync(_automationId: number, _exceptConditionIds: number[]): Promise<void> { return; }
  async deleteOutputAutomationConditionsExceptAsync(_automationId: number, _exceptConditionIds: number[]): Promise<void> { return; }
}
