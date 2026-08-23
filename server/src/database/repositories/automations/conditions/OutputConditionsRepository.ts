import { ConditionGroupType, ConditionOperator } from "@sproot/common/automation/ConditionTypes";
import { IOutputCondition } from "@sproot/common/automation/IOutputCondition";
import type { IOutputConditionsRepository } from "./IOutputConditionsRepository";
import { SDBOutputCondition } from "@sproot/common/database/SDBOutputCondition";
import { Knex } from "knex";
import { BaseKnexRepository } from "../../utils/BaseKnexRepository";
import { getLookbackDate } from "../../../databaseQueryUtils";

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

  async getMostRecentViolationAsync(
    outputId: number,
    operator: ConditionOperator,
    comparisonValue: number,
    comparisonLookback: number,
    now: Date = new Date(),
  ): Promise<Date | null> {
    const violationPredicate = buildViolationPredicate("d.value", operator);
    const row = await this.connection("output_data as d")
      .select("d.logTime")
      .where("d.output_id", outputId)
      .andWhere("d.logTime", ">", getLookbackDate(now, comparisonLookback))
      .andWhereRaw(violationPredicate, [comparisonValue])
      .orderBy("d.logTime", "desc")
      .first();

    return row?.logTime != null ? new Date(row.logTime) : null;
  }

  async deleteAsync(conditionId: number): Promise<void> {
    return this.connection("output_conditions").where("id", conditionId).delete();
  }
}

function buildViolationPredicate(valueExpression: string, operator: ConditionOperator): string {
  switch (operator) {
    case "equal":
      return `${valueExpression} <> ?`;
    case "notEqual":
      return `${valueExpression} = ?`;
    case "greater":
      return `${valueExpression} <= ?`;
    case "greaterOrEqual":
      return `${valueExpression} < ?`;
    case "less":
      return `${valueExpression} >= ?`;
    case "lessOrEqual":
      return `${valueExpression} > ?`;
  }
}
