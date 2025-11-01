import { Models } from "@sproot/sproot-common/src/sensors/Models";

type SDBSensor = {
  id: number;
  name: string;
  externalDeviceName: string | null;
  model: keyof typeof Models;
  hostName: string | null;
  address: string | null;
  secureToken: string | null;
  color: string;
  pin: string | null;
  lowCalibrationPoint: number | null;
  highCalibrationPoint: number | null;
};

export type { SDBSensor };
