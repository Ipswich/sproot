import { ConditionGroupType } from "@sproot/common/automation/ConditionTypes";
import { IDateRangeCondition } from "@sproot/common/automation/IDateRangeCondition";
import type { IDateRangeConditionsRepository } from "./IDateRangeConditionsRepository";
import { SDBDateRangeCondition } from "@sproot/common/database/SDBDateRangeCondition";
import { Knex } from "knex";
import { BaseKnexRepository } from "../../utils/BaseKnexRepository";

export class DateRangeConditionsRepository
  extends BaseKnexRepository
  implements IDateRangeConditionsRepository
{
  constructor(connection: Knex) {
    super(connection);
  }

  async getAsync(automationId: number): Promise<SDBDateRangeCondition[]> {
    return this.connection("date_range_conditions")
      .where("automation_id", automationId)
      .select([
        "id",
        "automation_id as automationId",
        "groupType",
        "startMonth",
        "startDate",
        "endMonth",
        "endDate",
      ])
      .orderBy("id", "asc");
  }

  async addAsync(
    automationId: number,
    groupType: ConditionGroupType,
    startMonth: number,
    startDate: number,
    endMonth: number,
    endDate: number,
  ): Promise<number> {
    return this.insertAndGetIdAsync("date_range_conditions", {
      automation_id: automationId,
      groupType,
      startMonth,
      startDate,
      endMonth,
      endDate,
    });
  }

  async updateAsync(automationId: number, condition: IDateRangeCondition): Promise<void> {
    return this.connection("date_range_conditions")
      .where("automation_id", automationId)
      .and.where("id", condition.id)
      .update({
        groupType: condition.groupType,
        startMonth: condition.startMonth,
        startDate: condition.startDate,
        endMonth: condition.endMonth,
        endDate: condition.endDate,
      });
  }

  async deleteAsync(conditionId: number): Promise<void> {
    return this.connection("date_range_conditions").where("id", conditionId).delete();
  }
}
