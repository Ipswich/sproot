enum ReadingType {
  temperature = "temperature",
  humidity = "humidity",
  pressure = "pressure",
}

interface ISensorBase {
  id: number;
  name: string;
  model: string;
  address: string | null;
  lastReading: Record<ReadingType, string>;
  lastReadingTime: Date | null;
  readonly units: Record<ReadingType, string>;
}

export { ReadingType };
export type { ISensorBase };
