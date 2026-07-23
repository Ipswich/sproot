/* eslint-disable @typescript-eslint/no-unused-vars */
import { SDBOutputAction } from "../../SDBOutputAction";
import { IActionBaseRepository } from "../conditions/IBaseConditions.repository";

export interface IOutputActionsRepository extends IActionBaseRepository<SDBOutputAction> {
  getAllAsync(): Promise<SDBOutputAction[]>;
  getAsync(automationId: number): Promise<SDBOutputAction[]>;
  addAsync(automationId: number, outputId: number, value: number): Promise<number>;
  getOutputActionAsync(actionId: number): Promise<SDBOutputAction[]>;
  getActionsByOutputIdAsync(outputId: number): Promise<SDBOutputAction[]>;
  updateAsync(automationId: number, action: SDBOutputAction): Promise<void>;
}

export class MockOutputActionsRepository implements IOutputActionsRepository {
  async getAllAsync(): Promise<SDBOutputAction[]> {
    return [];
  }
  async getAsync(_automationId: number): Promise<SDBOutputAction[]> {
    return [];
  }
  async addAsync(_automationId: number, _outputId: number, _value: number): Promise<number> {
    return 0;
  }
  async getOutputActionAsync(_actionId: number): Promise<SDBOutputAction[]> {
    return [];
  }
  async getActionsByOutputIdAsync(_outputId: number): Promise<SDBOutputAction[]> {
    return [];
  }
  async updateAsync(_automationId: number, _action: SDBOutputAction): Promise<void> {
    return;
  }
  async deleteAsync(_actionId: number): Promise<void> {
    return;
  }
}
