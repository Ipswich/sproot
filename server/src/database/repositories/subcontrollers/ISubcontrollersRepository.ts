import { SDBSubcontroller } from "@sproot/common/database/SDBSubcontroller";

export interface ISubcontrollersRepository {
  getAllAsync(): Promise<SDBSubcontroller[]>;
  addAsync(sensor: SDBSubcontroller): Promise<number>;
  updateAsync(sensor: SDBSubcontroller): Promise<number>;
  deleteAsync(id: number): Promise<number>;
}
