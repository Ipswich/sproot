import { SDBDeviceZone } from "@sproot/sproot-common/dist/database/SDBDeviceZone";
import { IDeviceZonesRepository } from "@sproot/sproot-common/dist/database/ISprootDB";
import { Knex } from "knex";
import { BaseKnexRepository } from "./BaseKnexRepository";

export class DeviceZonesRepository
  extends BaseKnexRepository
  implements IDeviceZonesRepository
{
  constructor(connection: Knex) {
    super(connection);
  }

  async getDeviceZonesAsync(): Promise<SDBDeviceZone[]> {
    return this.connection("device_zones").select("*");
  }

  async addDeviceZoneAsync(name: string): Promise<number> {
    return this.insertAndGetIdAsync("device_zones", { name });
  }

  async updateDeviceZoneAsync(deviceZone: SDBDeviceZone): Promise<void> {
    return this.connection("device_zones")
      .where("id", deviceZone.id)
      .update({ name: deviceZone.name });
  }

  async deleteDeviceZoneAsync(id: number): Promise<void> {
    return this.connection("device_zones").where("id", id).delete();
  }
}