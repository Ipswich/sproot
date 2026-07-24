/* eslint-disable @typescript-eslint/no-unused-vars */
import { SDBTimeCondition } from "@sproot/common/src/database/SDBTimeCondition";
import { ConditionGroupType } from "@sproot/common/src/automation/ConditionTypes";
import { ITimeCondition } from "../../../automation/ITimeCondition";
import { IBaseConditionsRepository } from "./IBaseConditionsRepository";

export interface ITimeConditionsRepository extends IBaseConditionsRepository<SDBTimeCondition> {
  addAsync(
    automationId: number,
    type: ConditionGroupType,
    startTime: string | undefined | null,
    endTime: string | undefined | null,
  ): Promise<number>;
  updateAsync(automationId: number, condition: ITimeCondition): Promise<void>;
}

export class MockTimeConditionsRepository implements ITimeConditionsRepository {
  async getAsync(_automationId: number): Promise<SDBTimeCondition[]> {
    return [];
  }
  async addAsync(
    _automationId: number,
    _type: ConditionGroupType,
    _startTime: string | undefined | null,
    _endTime: string | undefined | null,
  ): Promise<number> {
    return 0;
  }
  async updateAsync(_automationId: number, _condition: ITimeCondition): Promise<void> {
    return;
  }
  async deleteAsync(_conditionId: number): Promise<void> {
    return;
  }
}
