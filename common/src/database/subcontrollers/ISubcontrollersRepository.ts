/* eslint-disable @typescript-eslint/no-unused-vars */
import { SDBSubcontroller } from "@sproot/common/src/database/SDBSubcontroller";

export interface ISubcontrollersRepository {
  getAllAsync(): Promise<SDBSubcontroller[]>;
  addAsync(sensor: SDBSubcontroller): Promise<number>;
  updateAsync(sensor: SDBSubcontroller): Promise<number>;
  deleteAsync(id: number): Promise<number>;
}

export class MockSubcontrollersRepository implements ISubcontrollersRepository {
  async getAllAsync(): Promise<SDBSubcontroller[]> {
    return [];
  }
  async addAsync(_subcontroller: SDBSubcontroller): Promise<number> {
    return 0;
  }
  async updateAsync(_subcontroller: SDBSubcontroller): Promise<number> {
    return 0;
  }
  async deleteAsync(_id: number): Promise<number> {
    return 0;
  }
}
