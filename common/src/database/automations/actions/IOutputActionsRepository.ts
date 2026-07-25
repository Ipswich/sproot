/* eslint-disable @typescript-eslint/no-unused-vars */
import { SDBOutputAction } from "../../SDBOutputAction";
import { IActionBaseRepository } from "../conditions/IBaseConditionsRepository";

export interface IOutputActionsRepository extends IActionBaseRepository<SDBOutputAction> {
  getAllAsync(): Promise<SDBOutputAction[]>;
  getAsync(automationId: number): Promise<SDBOutputAction[]>;
  addAsync(automationId: number, outputId: number, value: number): Promise<number>;
  getOutputActionAsync(actionId: number): Promise<SDBOutputAction[]>;
  getActionsByOutputIdAsync(outputId: number): Promise<SDBOutputAction[]>;
  updateAsync(automationId: number, action: SDBOutputAction): Promise<void>;
}
