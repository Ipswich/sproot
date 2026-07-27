/* eslint-disable @typescript-eslint/no-unused-vars */
import { SDBTimeCondition } from "../../SDBTimeCondition";
import { ConditionGroupType } from "../../../automation/ConditionTypes";
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
