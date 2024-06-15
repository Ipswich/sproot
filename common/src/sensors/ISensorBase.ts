import { ReadingType } from "./ReadingType";

interface ISensorBase {
  id: number;
  name: string;
  model: string;
  address: string | null;
  lastReading: Record<ReadingType, string>;
  lastReadingTime: Date | null;
  readonly units: Record<ReadingType, string>;
  color?: string | undefined;
};

export type { ISensorBase };
