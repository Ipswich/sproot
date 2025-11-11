import { IAutomation } from "./IAutomation";

export interface IOutputAutomation extends IAutomation {
  outputAutomationId: string;
  output: string;
  value: number;
  enabled: boolean;
}
