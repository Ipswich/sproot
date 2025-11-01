import { Models } from "./Models";
import { ReadingType } from "./ReadingType";

interface ISensorBase {
  id: number;
  name: string;
  model: keyof typeof Models;
  hostName: string | null;
  address: string | null;
  color: string;
  pin: string | null;
  lowCalibrationPoint: number | null;
  highCalibrationPoint: number | null;
  lastReading: Partial<Record<ReadingType, string | undefined>>;
  lastReadingTime: Date | null;
  readonly units: Partial<Record<ReadingType, string>>;
  secureToken: string | null;
  externalDeviceName: string | null;
}

export type { ISensorBase };
