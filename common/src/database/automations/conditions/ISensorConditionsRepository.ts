/* eslint-disable @typescript-eslint/no-unused-vars */
import { SDBSensorCondition } from "@sproot/common/src/database/SDBSensorCondition";
import { ConditionGroupType, ConditionOperator } from "@sproot/common/src/automation/ConditionTypes";
import { ISensorCondition } from "../../../automation/ISensorCondition";
import { IBaseConditionsRepository } from "./IBaseConditionsRepository";

export interface ISensorConditionsRepository extends IBaseConditionsRepository<SDBSensorCondition> {
  addAsync(
    automationId: number,
    type: ConditionGroupType,
    operator: ConditionOperator,
    comparisonValue: number,
    comparisonLookback: number | null,
    sensorId: number,
    readingType: string,
  ): Promise<number>;
  updateAsync(automationId: number, condition: ISensorCondition): Promise<void>;
}

export class MockSensorConditionsRepository implements ISensorConditionsRepository {
  async getAsync(_automationId: number): Promise<SDBSensorCondition[]> {
    return [];
  }
  async addAsync(
    _automationId: number,
    _type: ConditionGroupType,
    _operator: ConditionOperator,
    _comparisonValue: number,
    _comparisonLookback: number | null,
    _sensorId: number,
    _readingType: string,
  ): Promise<number> {
    return 0;
  }
  async updateAsync(_automationId: number, _condition: ISensorCondition): Promise<void> {
    return;
  }
  async deleteAsync(_conditionId: number): Promise<void> {
    return;
  }
}
