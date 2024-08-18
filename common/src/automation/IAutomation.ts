import { ICondition } from "./ICondition";

export default interface IAutomation {
  value: number;
  conditionOperator: "and" | "or";
  conditions: {
    allOf: ICondition[];
    anyOf: ICondition[];
    oneOf: ICondition[];
  };
  startTime?: string | undefined; //24 hour, e.g. "hh:mm" OR null
  endTime?: string | undefined; //24 hour, e.g. "hh:mm" OR null
}
