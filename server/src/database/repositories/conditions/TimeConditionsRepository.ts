import { SDBTimeCondition } from "@sproot/common/dist/database/SDBTimeCondition";
import { ConditionGroupType } from "@sproot/common/dist/automation/ConditionTypes";
import { ITimeCondition } from "@sproot/common/dist/automation/ITimeCondition";
import { ITimeConditionsRepository } from "@sproot/common/dist/database/automations/conditions/ITimeConditionsRepository";
import { Knex } from "knex";
import { BaseKnexRepository } from "../utils/BaseKnexRepository";

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
      .select(["id", "automation_id as automationId", "groupType", "startTime", "endTime"])
      .orderBy("id", "asc");
  }

  async addAsync(
    automationId: number,
    type: ConditionGroupType,
    startTime: string | undefined | null,
    endTime: string | undefined | null,
  ): Promise<number> {
    return this.insertAndGetIdAsync("time_conditions", {
      automation_id: automationId,
      groupType: type,
      startTime,
      endTime,
    });
  }

  async updateAsync(automationId: number, condition: ITimeCondition): Promise<void> {
    return this.connection("time_conditions")
      .where("automation_id", automationId)
      .and.where("id", condition.id)
      .update({
        groupType: condition.groupType,
        startTime: condition.startTime,
        endTime: condition.endTime,
      });
  }

  async deleteAsync(conditionId: number): Promise<void> {
    return this.connection("time_conditions").where("id", conditionId).delete();
  }
}
