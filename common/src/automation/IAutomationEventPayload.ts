import { AutomationOperator } from "./IAutomation";
import { IConditionProperties } from "./IConditionProperties";

export interface IAutomationEventPayload {
  automationId: number;
  automationName: string;
  operator: AutomationOperator;
  conditions: {
    allOf: { condition: IConditionProperties; result: boolean }[];
    anyOf: { condition: IConditionProperties; result: boolean }[];
    oneOf: { condition: IConditionProperties; result: boolean }[];
  };
}
