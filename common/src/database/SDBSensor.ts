import {Models} from "@sproot/sproot-common/src/sensors/Models";

type SDBSensor = {
  id: number;
  name: string;
  model: keyof typeof Models;
  address: string | null;
  color: string;
  pin: string | null;
  lowCalibrationPoint: number | null;
  highCalibrationPoint: number | null;
};

export type { SDBSensor };
