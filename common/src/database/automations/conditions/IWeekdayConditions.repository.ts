/* eslint-disable @typescript-eslint/no-unused-vars */
import { SDBWeekdayCondition } from "@sproot/sproot-common/src/database/SDBWeekdayCondition";
import { ConditionGroupType } from "@sproot/sproot-common/src/automation/ConditionTypes";
import { IWeekdayCondition } from "../../../automation/IWeekdayCondition";
import { IBaseConditionsRepository } from "./IBaseConditions.repository";

export interface IWeekdayConditionsRepository extends IBaseConditionsRepository<SDBWeekdayCondition> {
  addAsync(automationId: number, groupType: ConditionGroupType, weekdays: number): Promise<number>;
  updateAsync(automationId: number, condition: IWeekdayCondition): Promise<void>;
}

export class MockWeekdayConditionsRepository implements IWeekdayConditionsRepository {
  async getAsync(_automationId: number): Promise<SDBWeekdayCondition[]> {
    return [];
  }
  async addAsync(
    _automationId: number,
    _groupType: ConditionGroupType,
    _weekdays: number,
  ): Promise<number> {
    return 0;
  }
  async updateAsync(_automationId: number, _condition: IWeekdayCondition): Promise<void> {
    return;
  }
  async deleteAsync(_conditionId: number): Promise<void> {
    return;
  }
}
