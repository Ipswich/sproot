import { AutomationOperator } from "@sproot/automation/IAutomation";
import { IConditionProperties } from "./conditions/Conditions";

export interface AutomationEventPayload {
  automationId: number;
  automationName: string;
  operator: AutomationOperator;
  conditions: {
    allOf: { condition: IConditionProperties; result: boolean }[];
    anyOf: { condition: IConditionProperties; result: boolean }[];
    oneOf: { condition: IConditionProperties; result: boolean }[];
  };
}

export class AutomationEvent {
  triggeredAutomations: Map<number, AutomationEventPayload>;
  timestamp: Date;

  constructor(
    triggeredAutomations: Map<number, AutomationEventPayload>,
    timestamp: Date = new Date(),
  ) {
    this.triggeredAutomations = triggeredAutomations;
    this.timestamp = timestamp;
  }
}
