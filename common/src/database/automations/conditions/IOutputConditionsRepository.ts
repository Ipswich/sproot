/* eslint-disable @typescript-eslint/no-unused-vars */
import { SDBOutputCondition } from "@sproot/common/src/database/SDBOutputCondition";
import { ConditionGroupType, ConditionOperator } from "@sproot/common/src/automation/ConditionTypes";
import { IOutputCondition } from "../../../automation/IOutputCondition";
import { IBaseConditionsRepository } from "./IBaseConditionsRepository";

export interface IOutputConditionsRepository extends IBaseConditionsRepository<SDBOutputCondition> {
  addAsync(
    automationId: number,
    type: ConditionGroupType,
    operator: ConditionOperator,
    comparisonValue: number,
    comparisonLookback: number | null,
    outputId: number,
  ): Promise<number>;
  updateAsync(automationId: number, condition: IOutputCondition): Promise<void>;
}

export class MockOutputConditionsRepository implements IOutputConditionsRepository {
  async getAsync(_automationId: number): Promise<SDBOutputCondition[]> {
    return [];
  }
  async addAsync(
    _automationId: number,
    _type: ConditionGroupType,
    _operator: ConditionOperator,
    _comparisonValue: number,
    _comparisonLookback: number | null,
    _outputId: number,
  ): Promise<number> {
    return 0;
  }
  async updateAsync(_automationId: number, _condition: IOutputCondition): Promise<void> {
    return;
  }
  async deleteAsync(_conditionId: number): Promise<void> {
    return;
  }
}
