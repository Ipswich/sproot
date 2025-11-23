import { IAutomation } from "./IAutomation.js";

export interface IOutputAutomation extends IAutomation {
  outputAutomationId: string;
  output: string;
  value: number;
  enabled: boolean;
}
