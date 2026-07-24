import { INotificationActionsRepository } from "@sproot/common/dist/database/ISprootDB";
import { SDBNotificationAction } from "@sproot/common/dist/database/SDBNotificationAction";
import { Knex } from "knex";
import { BaseKnexRepository } from "../../utils/BaseKnexRepository";

export class NotificationActionsRepository
  extends BaseKnexRepository
  implements INotificationActionsRepository
{
  constructor(connection: Knex) {
    super(connection);
  }

  async getAsync(automationId: number): Promise<SDBNotificationAction[]> {
    return this.connection("notification_actions")
      .where("automation_id", automationId)
      .select(["id", "automation_id as automationId", "subject", "content"])
      .orderBy("id", "asc");
  }

  async getAllAsync(): Promise<SDBNotificationAction[]> {
    return this.connection("notification_actions").select([
      "id",
      "automation_id as automationId",
      "subject",
      "content",
    ]);
  }

  async addAsync(automationId: number, subject: string, content: string): Promise<number> {
    return this.insertAndGetIdAsync("notification_actions", {
      automation_id: automationId,
      subject,
      content,
    });
  }

  async getNotificationActionByIdAsync(actionId: number): Promise<SDBNotificationAction[]> {
    return this.connection("notification_actions")
      .where("id", actionId)
      .select(["id", "automation_id as automationId", "subject", "content"]);
  }

  async updateAsync(automationId: number, action: SDBNotificationAction): Promise<void> {
    return this.connection("notification_actions")
      .where("automation_id", automationId)
      .and.where("id", action.id)
      .update({ subject: action.subject, content: action.content });
  }

  async deleteAsync(actionId: number): Promise<void> {
    return this.connection("notification_actions").where("id", actionId).delete();
  }
}
