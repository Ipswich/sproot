import { Models } from "@sproot/sproot-common/src/sensors/Models";

type SDBSensor = {
  id: number;
  name: string;
  model: keyof typeof Models;
  subcontrollerId: number | null;
  address: string | null;
  color: string;
  pin: string | null;
  deviceGroupId: number | null;
  lowCalibrationPoint: number | null;
  highCalibrationPoint: number | null;
};

export type { SDBSensor };
