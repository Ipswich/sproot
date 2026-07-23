import { ConditionGroupType } from "@sproot/sproot-common/dist/automation/ConditionTypes";
import { IWeekdayCondition } from "@sproot/sproot-common/dist/automation/IWeekdayCondition";
import { IWeekdayConditionsRepository } from "@sproot/sproot-common/dist/database/ISprootDB";
import { SDBWeekdayCondition } from "@sproot/sproot-common/dist/database/SDBWeekdayCondition";
import { Knex } from "knex";
import { BaseKnexRepository } from "./BaseKnexRepository";

export class WeekdayConditionsRepository
  extends BaseKnexRepository
  implements IWeekdayConditionsRepository
{
  constructor(connection: Knex) {
    super(connection);
  }

  async getAsync(automationId: number): Promise<SDBWeekdayCondition[]> {
    return this.connection("weekday_conditions")
      .where("automation_id", automationId)
      .select(["id", "automation_id as automationId", "groupType", "weekdays"])
      .orderBy("id", "asc");
  }

  async addAsync(
    automationId: number,
    groupType: ConditionGroupType,
    weekdays: number,
  ): Promise<number> {
    return this.insertAndGetIdAsync("weekday_conditions", {
      automation_id: automationId,
      groupType,
      weekdays,
    });
  }

  async updateAsync(automationId: number, condition: IWeekdayCondition): Promise<void> {
    return this.connection("weekday_conditions")
      .where("automation_id", automationId)
      .and.where("id", condition.id)
      .update({ groupType: condition.groupType, weekdays: condition.weekdays });
  }

  async deleteAsync(conditionId: number): Promise<void> {
    return this.connection("weekday_conditions").where("id", conditionId).delete();
  }
}
