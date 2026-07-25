import { IAutomationsRepository } from "@sproot/common/dist/database/ISprootDB";
import { AutomationOperator } from "@sproot/common/dist/automation/IAutomation";
import { SDBAutomation } from "@sproot/common/dist/database/SDBAutomation";
import { SDBOutputActionView } from "@sproot/common/dist/database/SDBOutputAction";
import { Knex } from "knex";
import { BaseKnexRepository } from "../utils/BaseKnexRepository";

export class AutomationsRepository extends BaseKnexRepository implements IAutomationsRepository {
  constructor(connection: Knex) {
    super(connection);
  }

  async getAllAsync(): Promise<SDBAutomation[]> {
    return this.connection("automations").select("*");
  }

  async getByIdAsync(automationId: number): Promise<SDBAutomation[]> {
    return this.connection("automations").where("id", automationId).select("*");
  }

  async addAsync(name: string, operator: AutomationOperator): Promise<number> {
    return this.insertAndGetIdAsync("automations", { name, operator });
  }

  async updateAsync(
    name: string,
    operator: AutomationOperator,
    id: number,
    enabled: boolean,
  ): Promise<void> {
    return this.connection("automations").where("id", id).update({ name, operator, enabled });
  }

  async deleteAsync(automationId: number): Promise<void> {
    return this.connection("automations").where("id", automationId).delete();
  }

  async deleteSensorAutomationConditionsExceptAsync(
    automationId: number,
    exceptConditionIds: number[],
  ): Promise<void> {
    return this.connection("sensor_conditions")
      .where("automation_id", automationId)
      .andWhere("id", "not in", exceptConditionIds)
      .delete();
  }

  async deleteOutputAutomationConditionsExceptAsync(
    automationId: number,
    exceptConditionIds: number[],
  ): Promise<void> {
    return this.connection("output_conditions")
      .where("automation_id", automationId)
      .andWhere("id", "not in", exceptConditionIds)
      .delete();
  }

  async getAutomationsForOutputAsync(outputId: number): Promise<SDBOutputActionView[]> {
    return this.connection("output_actions_view").where("outputId", outputId).select("*");
  }
}
