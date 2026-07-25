import { SDBOutputCondition } from "@sproot/common/dist/database/SDBOutputCondition";
import {
  ConditionGroupType,
  ConditionOperator,
} from "@sproot/common/dist/automation/ConditionTypes";
import { IOutputCondition } from "@sproot/common/dist/automation/IOutputCondition";
import { IOutputConditionsRepository } from "@sproot/common/dist/database/automations/conditions/IOutputConditionsRepository";
import { Knex } from "knex";
import { BaseKnexRepository } from "../utils/BaseKnexRepository";

export class OutputConditionsRepository
  extends BaseKnexRepository
  implements IOutputConditionsRepository
{
  constructor(connection: Knex) {
    super(connection);
  }

  async getAsync(automationId: number): Promise<SDBOutputCondition[]> {
    return this.connection("output_conditions as oc")
      .select([
        "oc.id",
        "oc.automation_id as automationId",
        "oc.groupType",
        "oc.operator",
        "oc.comparisonValue",
        "oc.comparisonLookback",
        "oc.output_id as outputId",
        "o.name as outputName",
      ])
      .innerJoin("outputs as o", "oc.output_id", "o.id")
      .where("automation_id", automationId)
      .orderBy("oc.id", "asc");
  }

  async addAsync(
    automationId: number,
    type: ConditionGroupType,
    operator: ConditionOperator,
    comparisonValue: number,
    comparisonLookback: number | null,
    outputId: number,
  ): Promise<number> {
    return this.insertAndGetIdAsync("output_conditions", {
      automation_id: automationId,
      groupType: type,
      operator,
      comparisonValue,
      comparisonLookback,
      output_id: outputId,
    });
  }

  async updateAsync(automationId: number, condition: IOutputCondition): Promise<void> {
    return this.connection("output_conditions")
      .where("automation_id", automationId)
      .and.where("id", condition.id)
      .update({
        groupType: condition.groupType,
        operator: condition.operator,
        comparisonValue: condition.comparisonValue,
        comparisonLookback: condition.comparisonLookback,
        output_id: condition.outputId,
      });
  }

  async deleteAsync(conditionId: number): Promise<void> {
    return this.connection("output_conditions").where("id", conditionId).delete();
  }
}
