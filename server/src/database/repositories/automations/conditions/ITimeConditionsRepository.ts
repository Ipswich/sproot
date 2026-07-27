import { SDBTimeCondition } from "@sproot/common/database/SDBTimeCondition";
import { ConditionGroupType } from "@sproot/common/automation/ConditionTypes";
import { ITimeCondition } from "@sproot/common/automation/ITimeCondition";
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
