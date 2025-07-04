import ModelList from "../sensors/ModelList";

type SDBSensor = {
  id: number;
  name: string;
  model: keyof typeof ModelList;
  address: string | null;
  color: string;
  pin: string | null;
  lowCalibrationPoint: number | null;
  highCalibrationPoint: number | null;
};

export type { SDBSensor };
