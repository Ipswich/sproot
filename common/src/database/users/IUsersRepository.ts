/* eslint-disable @typescript-eslint/no-unused-vars */
import { SDBUser } from "@sproot/common/src/database/SDBUser";

export interface IUsersRepository {
  getByIdAsync(username: string): Promise<SDBUser[]>;
  addAsync(user: SDBUser): Promise<void>;
}

export class MockUsersRepository implements IUsersRepository {
  async getByIdAsync(_username: string): Promise<SDBUser[]> {
    return [];
  }
  async addAsync(_user: SDBUser): Promise<void> {
    return;
  }
}
