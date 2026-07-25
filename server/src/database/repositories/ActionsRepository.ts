import { Knex } from "knex";
import { IActionsRepository } from "@sproot/common/dist/database/automations/IAutomationsRepository";
import { IOutputActionsRepository } from "@sproot/common/dist/database/automations/actions/IOutputActionsRepository";
import { INotificationActionsRepository } from "@sproot/common/dist/database/automations/actions/INotificationActionsRepository";
import { SDBOutputAction } from "@sproot/common/dist/database/SDBOutputAction";
import { SDBNotificationAction } from "@sproot/common/dist/database/SDBNotificationAction";

class OutputActionsRepository implements IOutputActionsRepository {
  #connection: Knex;

  constructor(connection: Knex) {
    this.#connection = connection;
  }

  async getAsync(automationId: number): Promise<SDBOutputAction[]> {
    return this.#connection("output_actions")
      .where("automation_id", automationId)
      .select(["id", "automation_id as automationId", "output_id as outputId", "value"]);
  }

  async addAsync(automationId: number, outputId: number, value: number): Promise<number> {
    const [id] = await this.#connection("output_actions").insert({
      automation_id: automationId,
      output_id: outputId,
      value,
    });
    return id as number;
  }

  async updateAsync(automationId: number, action: SDBOutputAction): Promise<void> {
    await this.#connection("output_actions")
      .where("automation_id", automationId)
      .and.where("id", action.id)
      .update({ output_id: action.outputId, value: action.value });
  }

  async deleteAsync(actionId: number): Promise<void> {
    await this.#connection("output_actions").where("id", actionId).delete();
  }

  async getAllAsync(): Promise<SDBOutputAction[]> {
    return this.#connection("output_actions").select([
      "id",
      "automation_id as automationId",
      "output_id as outputId",
      "value",
    ]);
  }

  async getOutputActionAsync(actionId: number): Promise<SDBOutputAction[]> {
    return this.#connection("output_actions")
      .where("id", actionId)
      .select(["id", "automation_id as automationId", "output_id as outputId", "value"]);
  }

  async getActionsByOutputIdAsync(outputId: number): Promise<SDBOutputAction[]> {
    return this.#connection("output_actions")
      .where("output_id", outputId)
      .select(["id", "automation_id as automationId", "output_id as outputId", "value"]);
  }
}

class NotificationActionsRepository implements INotificationActionsRepository {
  #connection: Knex;

  constructor(connection: Knex) {
    this.#connection = connection;
  }

  async getAsync(automationId: number): Promise<SDBNotificationAction[]> {
    return this.#connection("notification_actions")
      .where("automation_id", automationId)
      .select(["id", "automation_id as automationId", "subject", "content"]);
  }

  async addAsync(automationId: number, subject: string, content: string): Promise<number> {
    const [id] = await this.#connection("notification_actions").insert({
      automation_id: automationId,
      subject,
      content,
    });
    return id as number;
  }

  async updateAsync(automationId: number, action: SDBNotificationAction): Promise<void> {
    await this.#connection("notification_actions")
      .where("automation_id", automationId)
      .and.where("id", action.id)
      .update({ subject: action.subject, content: action.content });
  }

  async deleteAsync(actionId: number): Promise<void> {
    await this.#connection("notification_actions").where("id", actionId).delete();
  }

  async getAllAsync(): Promise<SDBNotificationAction[]> {
    return this.#connection("notification_actions").select([
      "id",
      "automation_id as automationId",
      "subject",
      "content",
    ]);
  }

  async getNotificationActionByIdAsync(actionId: number): Promise<SDBNotificationAction[]> {
    return this.#connection("notification_actions")
      .where("id", actionId)
      .select(["id", "automation_id as automationId", "subject", "content"]);
  }
}

export class ActionsRepository implements IActionsRepository {
  output: IOutputActionsRepository;
  notification: INotificationActionsRepository;

  constructor(connection: Knex) {
    this.output = new OutputActionsRepository(connection);
    this.notification = new NotificationActionsRepository(connection);
  }
}
