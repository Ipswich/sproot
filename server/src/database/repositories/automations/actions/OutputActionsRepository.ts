import type { IOutputActionsRepository } from "./IOutputActionsRepository";
import { SDBOutputAction } from "@sproot/common/database/SDBOutputAction";
import { Knex } from "knex";
import { BaseKnexRepository } from "../../utils/BaseKnexRepository";

export class OutputActionsRepository
  extends BaseKnexRepository
  implements IOutputActionsRepository
{
  constructor(connection: Knex) {
    super(connection);
  }

  async getAsync(automationId: number): Promise<SDBOutputAction[]> {
    return this.connection("output_actions as oa")
      .innerJoin("automations as a", "oa.automation_id", "a.id")
      .where("oa.automation_id", automationId)
      .select([
        "oa.id as id",
        "oa.automation_id as automationId",
        "oa.output_id as outputId",
        "oa.value as value",
        "oa.precedence as precedence",
        "a.name as automationName",
      ])
      .orderBy("oa.id", "asc");
  }

  async getAllAsync(): Promise<SDBOutputAction[]> {
    return this.connection("output_actions as oa")
      .innerJoin("automations as a", "oa.automation_id", "a.id")
      .select([
        "oa.id as id",
        "oa.automation_id as automationId",
        "oa.output_id as outputId",
        "oa.value as value",
        "oa.precedence as precedence",
        "a.name as automationName",
      ]);
  }

  async addAsync(
    automationId: number,
    outputId: number,
    value: number,
    precedence: SDBOutputAction["precedence"],
  ): Promise<number> {
    return this.insertAndGetIdAsync("output_actions", {
      automation_id: automationId,
      output_id: outputId,
      value,
      precedence,
    });
  }

  async getOutputActionAsync(actionId: number): Promise<SDBOutputAction[]> {
    return this.connection("output_actions as oa")
      .innerJoin("automations as a", "oa.automation_id", "a.id")
      .where("oa.id", actionId)
      .select([
        "oa.id as id",
        "oa.automation_id as automationId",
        "oa.output_id as outputId",
        "oa.value as value",
        "oa.precedence as precedence",
        "a.name as automationName",
      ]);
  }

  async getActionsByOutputIdAsync(outputId: number): Promise<SDBOutputAction[]> {
    return this.connection("output_actions as oa")
      .innerJoin("automations as a", "oa.automation_id", "a.id")
      .where("oa.output_id", outputId)
      .select([
        "oa.id as id",
        "oa.automation_id as automationId",
        "oa.output_id as outputId",
        "oa.value as value",
        "oa.precedence as precedence",
        "a.name as automationName",
      ]);
  }

  async updateAsync(automationId: number, action: SDBOutputAction): Promise<void> {
    return this.connection("output_actions")
      .where("automation_id", automationId)
      .and.where("id", action.id)
      .update({
        output_id: action.outputId,
        value: action.value,
        precedence: action.precedence,
      });
  }

  async deleteAsync(actionId: number): Promise<void> {
    return this.connection("output_actions").where("id", actionId).delete();
  }
}
