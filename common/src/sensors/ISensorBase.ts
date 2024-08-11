import { ReadingType } from "./ReadingType";

interface ISensorBase {
  id: number;
  name: string;
  model: string;
  address: string | null;
  color: string;
  lastReading: Partial<Record<ReadingType, string>>;
  lastReadingTime: Date | null;
  readonly units: Partial<Record<ReadingType, string>>;
}

export type { ISensorBase };
