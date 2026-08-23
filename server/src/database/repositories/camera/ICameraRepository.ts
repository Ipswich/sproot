import { SDBCameraSettings } from "@sproot/common/database/SDBCameraSettings";

export interface ICameraRepository {
  getAllAsync(): Promise<SDBCameraSettings[]>;
  getByIdAsync(id: number): Promise<SDBCameraSettings | null>;
  addAsync(cameraSettings: Omit<SDBCameraSettings, "id">): Promise<number>;
  updateAsync(SDBCameraSettings: SDBCameraSettings): Promise<void>;
  deleteAsync(cameraId: number): Promise<void>;
}
