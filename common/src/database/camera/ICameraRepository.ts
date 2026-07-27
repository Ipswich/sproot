/* eslint-disable @typescript-eslint/no-unused-vars */
import { SDBCameraSettings } from "../SDBCameraSettings";

export interface ICameraRepository {
  getAllAsync(): Promise<SDBCameraSettings[]>;
  // addCameraSettingsAsync(SDBCameraSettings: SDBCameraSettings): Promise<number>;
  updateAsync(SDBCameraSettings: SDBCameraSettings): Promise<void>;
  // deleteCameraSettingsAsync(cameraId: number): Promise<void>;
}
