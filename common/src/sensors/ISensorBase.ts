import { ReadingType } from "./ReadingType";

interface ISensorBase {
  id: number;
  name: string;
  model: string;
  address: string | null;
  color?: string | undefined;
  lastReading: Record<ReadingType, string>;
  lastReadingTime: Date | null;
  readonly units: Record<ReadingType, string>;
}

export type { ISensorBase };
