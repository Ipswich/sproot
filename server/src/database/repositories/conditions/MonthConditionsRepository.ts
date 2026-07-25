import { SDBMonthCondition } from "@sproot/common/database/SDBMonthCondition";
import { ConditionGroupType } from "@sproot/common/automation/ConditionTypes";
import { IMonthCondition } from "@sproot/common/automation/IMonthCondition";
import { IMonthConditionsRepository } from "@sproot/common/database/automations/conditions/IMonthConditionsRepository";
import { Knex } from "knex";
import { BaseKnexRepository } from "../utils/BaseKnexRepository";

export class MonthConditionsRepository
  extends BaseKnexRepository
  implements IMonthConditionsRepository
{
  constructor(connection: Knex) {
    super(connection);
  }

  async getAsync(automationId: number): Promise<SDBMonthCondition[]> {
    return this.connection("month_conditions")
      .where("automation_id", automationId)
      .select(["id", "automation_id as automationId", "groupType", "months"])
      .orderBy("id", "asc");
  }

  async addAsync(
    automationId: number,
    groupType: ConditionGroupType,
    months: number,
  ): Promise<number> {
    return this.insertAndGetIdAsync("month_conditions", {
      automation_id: automationId,
      groupType,
      months,
    });
  }

  async updateAsync(automationId: number, condition: IMonthCondition): Promise<void> {
    return this.connection("month_conditions")
      .where("automation_id", automationId)
      .and.where("id", condition.id)
      .update({
        groupType: condition.groupType,
        months: condition.months,
      });
  }

  async deleteAsync(conditionId: number): Promise<void> {
    return this.connection("month_conditions").where("id", conditionId).delete();
  }
}
