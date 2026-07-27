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
    return this.connection("output_actions")
      .where("automation_id", automationId)
      .select(["id", "automation_id as automationId", "output_id as outputId", "value"])
      .orderBy("id", "asc");
  }

  async getAllAsync(): Promise<SDBOutputAction[]> {
    return this.connection("output_actions").select([
      "id",
      "automation_id as automationId",
      "output_id as outputId",
      "value",
    ]);
  }

  async addAsync(automationId: number, outputId: number, value: number): Promise<number> {
    return this.insertAndGetIdAsync("output_actions", {
      automation_id: automationId,
      output_id: outputId,
      value,
    });
  }

  async getOutputActionAsync(actionId: number): Promise<SDBOutputAction[]> {
    return this.connection("output_actions")
      .where("id", actionId)
      .select(["id", "automation_id as automationId", "output_id as outputId", "value"]);
  }

  async getActionsByOutputIdAsync(outputId: number): Promise<SDBOutputAction[]> {
    return this.connection("output_actions")
      .where("output_id", outputId)
      .select(["id", "automation_id as automationId", "output_id as outputId", "value"]);
  }

  async updateAsync(automationId: number, action: SDBOutputAction): Promise<void> {
    return this.connection("output_actions")
      .where("automation_id", automationId)
      .and.where("id", action.id)
      .update({ output_id: action.outputId, value: action.value });
  }

  async deleteAsync(actionId: number): Promise<void> {
    return this.connection("output_actions").where("id", actionId).delete();
  }
}
