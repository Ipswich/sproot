/**
 * Simple data interface representing a notification action.
 * Maps an automation to a notification with a subject and content.
 */
export class NotificationAction {
  id: number;
  automationId: number;
  subject: string;
  content: string;

  constructor(data: { id: number; automationId: number; subject: string; content: string }) {
    this.id = data.id;
    this.automationId = data.automationId;
    this.subject = data.subject;
    this.content = data.content;
  }
}
