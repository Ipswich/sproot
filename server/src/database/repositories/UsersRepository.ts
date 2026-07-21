import { IUsersRepository } from "@sproot/sproot-common/dist/database/ISprootDB";
import { SDBUser } from "@sproot/sproot-common/dist/database/SDBUser";
import { Knex } from "knex";
import { BaseKnexRepository } from "./BaseKnexRepository";

export class UsersRepository extends BaseKnexRepository implements IUsersRepository {
  constructor(connection: Knex) {
    super(connection);
  }

  async getUserAsync(username: string): Promise<SDBUser[]> {
    return this.connection("users").where("username", username).select("*");
  }

  async addUserAsync(user: SDBUser): Promise<void> {
    return this.connection("users").insert(user);
  }
}