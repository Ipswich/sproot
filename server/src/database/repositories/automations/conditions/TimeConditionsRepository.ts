import { ConditionGroupType } from "@sproot/common/automation/ConditionTypes";
import {
  ITimeCondition,
  TimeConditionPhaseAnchorType,
} from "@sproot/common/automation/ITimeCondition";
import type { ITimeConditionsRepository } from "./ITimeConditionsRepository";
import { SDBTimeCondition } from "@sproot/common/database/SDBTimeCondition";
import { Knex } from "knex";
import { BaseKnexRepository } from "../../utils/BaseKnexRepository";

export class TimeConditionsRepository
  extends BaseKnexRepository
  implements ITimeConditionsRepository
{
  constructor(connection: Knex) {
    super(connection);
  }

  async getAsync(automationId: number): Promise<SDBTimeCondition[]> {
    return this.connection("time_conditions")
      .where("automation_id", automationId)
      .select([
        "id",
        "automation_id as automationId",
        "groupType",
        "startTime",
        "startOffsetSeconds",
        "endTime",
        "endOffsetSeconds",
        "repeatInterval",
        "repeatDuration",
        "phaseAnchorType",
        "phaseAnchorValue",
      ])
      .orderBy("id", "asc");
  }

  async addAsync(
    automationId: number,
    type: ConditionGroupType,
    startTime: string | undefined | null,
    startOffsetSeconds: number | undefined | null,
    endTime: string | undefined | null,
    endOffsetSeconds: number | undefined | null,
    repeatInterval: number | undefined | null,
    repeatDuration: number | undefined | null,
    phaseAnchorType: TimeConditionPhaseAnchorType | undefined | null,
    phaseAnchorValue: string | undefined | null,
  ): Promise<number> {
    return this.insertAndGetIdAsync("time_conditions", {
      automation_id: automationId,
      groupType: type,
      startTime,
      startOffsetSeconds,
      endTime,
      endOffsetSeconds,
      repeatInterval,
      repeatDuration,
      phaseAnchorType,
      phaseAnchorValue,
    });
  }

  async updateAsync(automationId: number, condition: ITimeCondition): Promise<void> {
    return this.connection("time_conditions")
      .where("automation_id", automationId)
      .and.where("id", condition.id)
      .update({
        groupType: condition.groupType,
        startTime: condition.startTime,
        startOffsetSeconds: condition.startOffsetSeconds,
        endTime: condition.endTime,
        endOffsetSeconds: condition.endOffsetSeconds,
        repeatInterval: condition.repeatInterval,
        repeatDuration: condition.repeatDuration,
        phaseAnchorType: condition.phaseAnchorType,
        phaseAnchorValue: condition.phaseAnchorValue,
      });
  }

  async deleteAsync(conditionId: number): Promise<void> {
    return this.connection("time_conditions").where("id", conditionId).delete();
  }
}
