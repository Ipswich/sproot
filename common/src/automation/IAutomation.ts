import { ICondition } from "./ICondition";

export interface IAutomation {
  id: number;
  name: string;
  value: number;
  operator: AutomationOperator;
  rules: IAutomationRules;
  startTime?: string | undefined | null; //24 hour, e.g. "hh:mm" OR null
  endTime?: string | undefined | null; //24 hour, e.g. "hh:mm" OR null
}

export interface IAutomationRules {
  allOf: ICondition[];
  anyOf: ICondition[];
  oneOf: ICondition[];
}

export type AutomationOperator = "and" | "or";