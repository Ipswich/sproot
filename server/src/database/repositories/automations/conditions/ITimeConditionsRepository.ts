import { SDBTimeCondition } from "@sproot/common/database/SDBTimeCondition";
import { ConditionGroupType } from "@sproot/common/automation/ConditionTypes";
import {
  ITimeCondition,
  TimeConditionPhaseAnchorType,
} from "@sproot/common/automation/ITimeCondition";
import { IBaseConditionsRepository } from "./IBaseConditionsRepository";

export interface ITimeConditionsRepository extends IBaseConditionsRepository<SDBTimeCondition> {
  addAsync(
    automationId: number,
    type: ConditionGroupType,
    startTime: string | undefined | null,
    endTime: string | undefined | null,
    repeatInterval: number | undefined | null,
    repeatDuration: number | undefined | null,
    phaseAnchorType: TimeConditionPhaseAnchorType | undefined | null,
    phaseAnchorValue: string | undefined | null,
  ): Promise<number>;
  updateAsync(automationId: number, condition: ITimeCondition): Promise<void>;
}
