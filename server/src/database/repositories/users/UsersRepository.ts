import type { IUsersRepository } from "./IUsersRepository";
import { SDBUser } from "@sproot/common/database/SDBUser";
import { Knex } from "knex";
import { BaseKnexRepository } from "../utils/BaseKnexRepository";

export class UsersRepository extends BaseKnexRepository implements IUsersRepository {
  constructor(connection: Knex) {
    super(connection);
  }

  async getAllAsync(): Promise<SDBUser[]> {
    return this.connection("users").select("*");
  }

  async getByIdAsync(username: string): Promise<SDBUser[]> {
    return this.connection("users").where("username", username).select("*");
  }

  async countAsync(): Promise<number> {
    const result = await this.connection("users").count("* as count").first();
    const count = result?.["count"];
    if (typeof count === "number") {
      return count;
    }

    return Number(count ?? 0);
  }

  async addAsync(user: SDBUser): Promise<void> {
    return this.connection("users").insert(user);
  }

  async updatePasswordAsync(username: string, hash: string): Promise<number> {
    return this.connection("users").where("username", username).update({ hash });
  }

  async incrementTokenVersionAsync(username: string): Promise<number> {
    return this.connection("users")
      .where("username", username)
      .increment("tokenVersion", 1);
  }

  async deleteAllAsync(): Promise<number> {
    return this.connection("users").del();
  }
}
