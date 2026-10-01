import { SDBUser } from "@sproot/common/database/SDBUser";

export interface IUsersRepository {
  getAllAsync(): Promise<SDBUser[]>;
  getByIdAsync(username: string): Promise<SDBUser[]>;
  countAsync(): Promise<number>;
  addAsync(user: SDBUser): Promise<void>;
  updatePasswordAsync(username: string, hash: string): Promise<number>;
  incrementTokenVersionAsync(username: string): Promise<number>;
  deleteAllAsync(): Promise<number>;
}
