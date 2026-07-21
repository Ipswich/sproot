import { ISubcontrollersRepository } from "@sproot/sproot-common/dist/database/ISprootDB";
import { SDBSubcontroller } from "@sproot/sproot-common/dist/database/SDBSubcontroller";
import { encrypt, decrypt } from "@sproot/sproot-common/dist/utility/Crypto";
import { Knex } from "knex";
import { BaseKnexRepository } from "./BaseKnexRepository";

export class SubcontrollersRepository
  extends BaseKnexRepository
  implements ISubcontrollersRepository
{
  constructor(connection: Knex) {
    super(connection);
  }

  async getSubcontrollersAsync(): Promise<SDBSubcontroller[]> {
    const result = await this.connection("subcontrollers").select("*");
    result.forEach((device: SDBSubcontroller) => {
      device.secureToken =
        device.secureToken == null ? null : decrypt(device.secureToken, process.env["JWT_SECRET"]!);
    });
    return result;
  }

  async addSubcontrollerAsync(subcontroller: SDBSubcontroller): Promise<number> {
    const copy = { ...subcontroller };
    copy.secureToken =
      copy.secureToken == null ? null : encrypt(copy.secureToken, process.env["JWT_SECRET"]!);
    return this.insertAndGetIdAsync("subcontrollers", copy);
  }

  async updateSubcontrollerAsync(subcontroller: SDBSubcontroller): Promise<number> {
    return this.connection("subcontrollers").where("id", subcontroller.id).update({
      name: subcontroller.name,
      type: subcontroller.type,
      hostName: subcontroller.hostName,
    });
  }

  async deleteSubcontrollersAsync(id: number): Promise<number> {
    return this.connection("subcontrollers").where("id", id).delete();
  }
}