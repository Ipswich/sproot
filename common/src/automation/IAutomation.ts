import { ICondition } from "./ICondition";

export default interface IAutomation {
  id: number;
  name: string;
  value: number;
  rules: IAutomationRules;
  startTime?: string | undefined | null; //24 hour, e.g. "hh:mm" OR null
  endTime?: string | undefined | null; //24 hour, e.g. "hh:mm" OR null
}

export interface IAutomationRules {
  operator: "and" | "or";
  allOf: ICondition[];
  anyOf: ICondition[];
  oneOf: ICondition[];
}
