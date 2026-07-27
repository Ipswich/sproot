import type { ICameraRepository } from "./ICameraRepository";
import { SDBCameraSettings } from "@sproot/common/database/SDBCameraSettings";
import { Knex } from "knex";
import { BaseKnexRepository } from "../utils/BaseKnexRepository";

export class CameraRepository extends BaseKnexRepository implements ICameraRepository {
  constructor(connection: Knex) {
    super(connection);
  }

  async getAllAsync(): Promise<SDBCameraSettings[]> {
    return this.connection("camera_settings").select("*");
  }

  async updateAsync(cameraSettings: SDBCameraSettings): Promise<void> {
    return this.connection("camera_settings").where("id", cameraSettings.id).update({
      id: cameraSettings.id,
      enabled: cameraSettings.enabled,
      name: cameraSettings.name,
      xVideoResolution: cameraSettings.xVideoResolution,
      yVideoResolution: cameraSettings.yVideoResolution,
      videoFps: cameraSettings.videoFps,
      xImageResolution: cameraSettings.xImageResolution,
      yImageResolution: cameraSettings.yImageResolution,
      timelapseEnabled: cameraSettings.timelapseEnabled,
      imageRetentionDays: cameraSettings.imageRetentionDays,
      imageRetentionSize: cameraSettings.imageRetentionSize,
      timelapseInterval: cameraSettings.timelapseInterval,
      timelapseStartTime: cameraSettings.timelapseStartTime,
      timelapseEndTime: cameraSettings.timelapseEndTime,
    });
  }
}
