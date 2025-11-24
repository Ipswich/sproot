
import { ReadingType } from "../sensors/ReadingType";

type SDBReading = {
  metric: ReadingType;
  data: string;
  units: string;
  logTime: string;
};

export type { SDBReading };
