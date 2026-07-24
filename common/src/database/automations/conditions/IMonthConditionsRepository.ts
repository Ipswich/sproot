/* eslint-disable @typescript-eslint/no-unused-vars */
import { SDBMonthCondition } from "@sproot/common/src/database/SDBMonthCondition";
import { ConditionGroupType } from "@sproot/common/src/automation/ConditionTypes";
import { IMonthCondition } from "../../../automation/IMonthCondition";
import { IBaseConditionsRepository } from "./IBaseConditionsRepository";

export interface IMonthConditionsRepository extends IBaseConditionsRepository<SDBMonthCondition> {
  addAsync(automationId: number, groupType: ConditionGroupType, months: number): Promise<number>;
  updateAsync(automationId: number, condition: IMonthCondition): Promise<void>;
}

export class MockMonthConditionsRepository implements IMonthConditionsRepository {
  async getAsync(_automationId: number): Promise<SDBMonthCondition[]> {
    return [];
  }
  async addAsync(
    _automationId: number,
    _groupType: ConditionGroupType,
    _months: number,
  ): Promise<number> {
    return 0;
  }
  async updateAsync(_automationId: number, _condition: IMonthCondition): Promise<void> {
    return;
  }
  async deleteAsync(_conditionId: number): Promise<void> {
    return;
  }
}
