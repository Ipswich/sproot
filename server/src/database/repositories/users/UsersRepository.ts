import type { IUsersRepository } from "@sproot/common/database/users/IUsersRepository";
import { SDBUser } from "@sproot/common/database/SDBUser";
import { Knex } from "knex";
import { BaseKnexRepository } from "../utils/BaseKnexRepository";

export class UsersRepository extends BaseKnexRepository implements IUsersRepository {
  constructor(connection: Knex) {
    super(connection);
  }

  async getByIdAsync(username: string): Promise<SDBUser[]> {
    return this.connection("users").where("username", username).select("*");
  }

  async addAsync(user: SDBUser): Promise<void> {
    return this.connection("users").insert(user);
  }
}
