import { SDBUser } from "@sproot/common/database/SDBUser";

export interface IUsersRepository {
  getByIdAsync(username: string): Promise<SDBUser[]>;
  addAsync(user: SDBUser): Promise<void>;
}
