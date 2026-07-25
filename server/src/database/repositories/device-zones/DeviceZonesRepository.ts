import { SDBDeviceZone } from "@sproot/common/database/SDBDeviceZone";
import type { IDeviceZonesRepository } from "@sproot/common/database/device-zones/IDeviceZonesRepository";
import { Knex } from "knex";
import { BaseKnexRepository } from "../utils/BaseKnexRepository";

export class DeviceZonesRepository extends BaseKnexRepository implements IDeviceZonesRepository {
  constructor(connection: Knex) {
    super(connection);
  }

  async getAllAsync(): Promise<SDBDeviceZone[]> {
    return this.connection("device_zones").select("*");
  }

  async addAsync(name: string): Promise<number> {
    return this.insertAndGetIdAsync("device_zones", { name });
  }

  async updateAsync(deviceZone: SDBDeviceZone): Promise<void> {
    return this.connection("device_zones")
      .where("id", deviceZone.id)
      .update({ name: deviceZone.name });
  }

  async deleteAsync(id: number): Promise<void> {
    return this.connection("device_zones").where("id", id).delete();
  }
}
