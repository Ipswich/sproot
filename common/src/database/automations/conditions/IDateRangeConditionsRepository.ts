/* eslint-disable @typescript-eslint/no-unused-vars */
import { SDBDateRangeCondition } from "@sproot/common/src/database/SDBDateRangeCondition";
import { ConditionGroupType } from "@sproot/common/src/automation/ConditionTypes";
import { IDateRangeCondition } from "../../../automation/IDateRangeCondition";
import { IBaseConditionsRepository } from "./IBaseConditionsRepository";

export interface IDateRangeConditionsRepository extends IBaseConditionsRepository<SDBDateRangeCondition> {
  addAsync(
    automationId: number,
    groupType: ConditionGroupType,
    startMonth: number,
    startDate: number,
    endMonth: number,
    endDate: number,
  ): Promise<number>;
  updateAsync(automationId: number, condition: IDateRangeCondition): Promise<void>;
}

export class MockDateRangeConditionsRepository implements IDateRangeConditionsRepository {
  async getAsync(_automationId: number): Promise<SDBDateRangeCondition[]> {
    return [];
  }
  async addAsync(
    _automationId: number,
    _groupType: ConditionGroupType,
    _startMonth: number,
    _startDate: number,
    _endMonth: number,
    _endDate: number,
  ): Promise<number> {
    return 0;
  }
  async updateAsync(_automationId: number, _condition: IDateRangeCondition): Promise<void> {
    return;
  }
  async deleteAsync(_conditionId: number): Promise<void> {
    return;
  }
}
