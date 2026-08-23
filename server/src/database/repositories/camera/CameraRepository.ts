import type { ICameraRepository } from "./ICameraRepository";
import { SDBCameraSettings } from "@sproot/common/database/SDBCameraSettings";
import { Knex } from "knex";
import { BaseKnexRepository } from "../utils/BaseKnexRepository";

export class CameraRepository extends BaseKnexRepository implements ICameraRepository {
  constructor(connection: Knex) {
    super(connection);
  }

  async getAllAsync(): Promise<SDBCameraSettings[]> {
    return this.connection("camera_settings").select("*").orderBy("id", "asc");
  }

  async getByIdAsync(id: number): Promise<SDBCameraSettings | null> {
    const camera = await this.connection("camera_settings").where("id", id).first();
    return camera ?? null;
  }

  async addAsync(cameraSettings: Omit<SDBCameraSettings, "id">): Promise<number> {
    return this.insertAndGetIdAsync("camera_settings", {
      enabled: cameraSettings.enabled,
      name: cameraSettings.name,
      captureUrl: cameraSettings.captureUrl,
      streamUrl: cameraSettings.streamUrl,
      healthUrl: cameraSettings.healthUrl,
      timelapseEnabled: cameraSettings.timelapseEnabled,
      imageRetentionDays: cameraSettings.imageRetentionDays,
      imageRetentionSize: cameraSettings.imageRetentionSize,
      timelapseInterval: cameraSettings.timelapseInterval,
      timelapseStartTime: cameraSettings.timelapseStartTime,
      timelapseStartOffsetSeconds: cameraSettings.timelapseStartOffsetSeconds,
      timelapseEndTime: cameraSettings.timelapseEndTime,
      timelapseEndOffsetSeconds: cameraSettings.timelapseEndOffsetSeconds,
    });
  }

  async updateAsync(cameraSettings: SDBCameraSettings): Promise<void> {
    return this.connection("camera_settings").where("id", cameraSettings.id).update({
      id: cameraSettings.id,
      enabled: cameraSettings.enabled,
      name: cameraSettings.name,
      captureUrl: cameraSettings.captureUrl,
      streamUrl: cameraSettings.streamUrl,
      healthUrl: cameraSettings.healthUrl,
      timelapseEnabled: cameraSettings.timelapseEnabled,
      imageRetentionDays: cameraSettings.imageRetentionDays,
      imageRetentionSize: cameraSettings.imageRetentionSize,
      timelapseInterval: cameraSettings.timelapseInterval,
      timelapseStartTime: cameraSettings.timelapseStartTime,
      timelapseStartOffsetSeconds: cameraSettings.timelapseStartOffsetSeconds,
      timelapseEndTime: cameraSettings.timelapseEndTime,
      timelapseEndOffsetSeconds: cameraSettings.timelapseEndOffsetSeconds,
    });
  }

  async deleteAsync(cameraId: number): Promise<void> {
    await this.connection("camera_settings").where("id", cameraId).delete();
  }
}
