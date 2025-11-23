import { Models } from "@sproot/sproot-common/src/sensors/Models.js";

type SDBSensor = {
  id: number;
  name: string;
  model: keyof typeof Models;
  subcontrollerId: number | null;
  address: string | null;
  color: string;
  pin: string | null;
  lowCalibrationPoint: number | null;
  highCalibrationPoint: number | null;
};

export type { SDBSensor };
