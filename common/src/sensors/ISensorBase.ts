import ModelList from "./ModelList";
import { ReadingType } from "./ReadingType";

interface ISensorBase {
  id: number;
  name: string;
  model: ModelList;
  address: string | null;
  color: string;
  pin: string | null;
  lowCalibrationPoint: number | null;
  highCalibrationPoint: number | null;
  lastReading: Partial<Record<ReadingType, string>>;
  lastReadingTime: Date | null;
  readonly units: Partial<Record<ReadingType, string>>;
}

export type { ISensorBase };
