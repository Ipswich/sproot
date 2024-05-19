// Used as keys for things like caches, charts, etc.
enum ReadingType {
  temperature = "temperature",
  humidity = "humidity",
  pressure = "pressure",
}

// Constants for the units of measurement for each reading type.
enum Units {
  temperature = "°C",
  humidity = "%rH",
  pressure = "hPa",
}

interface ISensorBase {
  id: number;
  name: string;
  model: string;
  address: string | null;
  lastReading: Record<ReadingType, string>;
  lastReadingTime: Date | null;
  readonly units: Record<ReadingType, string>;
  color?: string | undefined;
}

export { ReadingType, Units };
export type { ISensorBase };
