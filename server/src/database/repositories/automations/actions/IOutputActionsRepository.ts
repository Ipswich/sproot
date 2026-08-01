import { SDBOutputAction } from "@sproot/common/database/SDBOutputAction";
import { OutputActionPrecedence } from "@sproot/common/automation/OutputActionPrecedence";
import { IActionBaseRepository } from "../conditions/IBaseConditionsRepository";

export interface IOutputActionsRepository extends IActionBaseRepository<SDBOutputAction> {
  getAllAsync(): Promise<SDBOutputAction[]>;
  getAsync(automationId: number): Promise<SDBOutputAction[]>;
  addAsync(
    automationId: number,
    outputId: number,
    value: number,
    precedence: OutputActionPrecedence,
  ): Promise<number>;
  getOutputActionAsync(actionId: number): Promise<SDBOutputAction[]>;
  getActionsByOutputIdAsync(outputId: number): Promise<SDBOutputAction[]>;
  updateAsync(automationId: number, action: SDBOutputAction): Promise<void>;
}
