import { IAutomationEventPayload } from "@sproot/automation/IAutomationEventPayload";

export class AutomationEvent {
  triggeredAutomations: Map<number, IAutomationEventPayload>;
  timestamp: Date;

  constructor(
    triggeredAutomations: Map<number, IAutomationEventPayload>,
    timestamp: Date = new Date(),
  ) {
    this.triggeredAutomations = triggeredAutomations;
    this.timestamp = timestamp;
  }
}
