import { IAutomationsRepository } from "@sproot/sproot-common/dist/database/ISprootDB";
import { AutomationOperator } from "@sproot/sproot-common/dist/automation/IAutomation";
import { SDBAutomation } from "@sproot/sproot-common/dist/database/SDBAutomation";
import {
  SDBOutputAction,
  SDBOutputActionView,
} from "@sproot/sproot-common/dist/database/SDBOutputAction";
import { SDBNotificationAction } from "@sproot/sproot-common/dist/database/SDBNotificationAction";
import { Knex } from "knex";
import { BaseKnexRepository } from "./BaseKnexRepository";

export class AutomationsRepository extends BaseKnexRepository implements IAutomationsRepository {
  constructor(connection: Knex) {
    super(connection);
  }

  async getAutomationsAsync(): Promise<SDBAutomation[]> {
    return this.connection("automations").select("*");
  }

  async getAutomationAsync(automationId: number): Promise<SDBAutomation[]> {
    return this.connection("automations").where("id", automationId).select("*");
  }

  async addAutomationAsync(name: string, operator: AutomationOperator): Promise<number> {
    return this.insertAndGetIdAsync("automations", { name, operator });
  }

  async updateAutomationAsync(
    name: string,
    operator: AutomationOperator,
    id: number,
    enabled: boolean,
  ): Promise<void> {
    return this.connection("automations").where("id", id).update({ name, operator, enabled });
  }

  async deleteAutomationAsync(automationId: number): Promise<void> {
    return this.connection("automations").where("id", automationId).delete();
  }

  async getOutputActionsAsync(): Promise<SDBOutputAction[]> {
    return this.connection("output_actions").select([
      "id",
      "automation_id as automationId",
      "output_id as outputId",
      "value",
    ]);
  }

  async getOutputActionsByOutputIdAsync(outputId: number): Promise<SDBOutputAction[]> {
    return this.connection("output_actions")
      .where("output_id", outputId)
      .select(["id", "automation_id as automationId", "output_id as outputId", "value"]);
  }

  async getOutputActionsByAutomationIdAsync(automationId: number): Promise<SDBOutputAction[]> {
    return this.connection("output_actions")
      .where("automation_id", automationId)
      .select(["id", "automation_id as automationId", "output_id as outputId", "value"]);
  }

  async getOutputActionAsync(outputActionId: number): Promise<SDBOutputAction[]> {
    return this.connection("output_actions")
      .where("id", outputActionId)
      .select(["id", "automation_id as automationId", "output_id as outputId", "value"]);
  }

  async addOutputActionAsync(
    automationId: number,
    outputId: number,
    value: number,
  ): Promise<number> {
    return this.insertAndGetIdAsync("output_actions", {
      automation_id: automationId,
      output_id: outputId,
      value,
    });
  }

  async deleteOutputActionAsync(outputActionId: number): Promise<void> {
    return this.connection("output_actions").where("id", outputActionId).delete();
  }

  async getAutomationsForOutputAsync(outputId: number): Promise<SDBOutputActionView[]> {
    return this.connection("output_actions_view").where("outputId", outputId).select("*");
  }

  async getNotificationActionsAsync(): Promise<SDBNotificationAction[]> {
    return this.connection("notification_actions").select([
      "id",
      "automation_id as automationId",
      "subject",
      "content",
    ]);
  }

  async getNotificationActionByIdAsync(
    notificationActionId: number,
  ): Promise<SDBNotificationAction[]> {
    return this.connection("notification_actions")
      .where("id", notificationActionId)
      .select(["id", "automation_id as automationId", "subject", "content"]);
  }

  async getNotificationActionsByAutomationIdAsync(
    automationId: number,
  ): Promise<SDBNotificationAction[]> {
    return this.connection("notification_actions")
      .where("automation_id", automationId)
      .select(["id", "automation_id as automationId", "subject", "content"]);
  }

  async addNotificationActionAsync(
    automationId: number,
    subject: string,
    content: string,
  ): Promise<number> {
    return this.insertAndGetIdAsync("notification_actions", {
      automation_id: automationId,
      subject,
      content,
    });
  }

  async deleteNotificationActionAsync(notificationActionId: number): Promise<void> {
    return this.connection("notification_actions").where("id", notificationActionId).delete();
  }
}
