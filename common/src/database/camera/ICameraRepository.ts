/* eslint-disable @typescript-eslint/no-unused-vars */
import { SDBCameraSettings } from "@sproot/common/src/database/SDBCameraSettings";

export interface ICameraRepository {
  getAllAsync(): Promise<SDBCameraSettings[]>;
  // addCameraSettingsAsync(SDBCameraSettings: SDBCameraSettings): Promise<number>;
  updateAsync(SDBCameraSettings: SDBCameraSettings): Promise<void>;
  // deleteCameraSettingsAsync(cameraId: number): Promise<void>;
}

export class MockCameraRepository implements ICameraRepository {
  async getAllAsync(): Promise<SDBCameraSettings[]> {
    return [];
  }
  async updateAsync(_cameraSettings: SDBCameraSettings): Promise<void> {
    return;
  }
}
