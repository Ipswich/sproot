type SDBSensor = {
  id: number;
  name: string;
  model: string;
  address: string | null;
  color: string;
  pin: string | null;
  lowCalibrationPoint: number | null;
  highCalibrationPoint: number | null;
};

export type { SDBSensor };
