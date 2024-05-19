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

export { ReadingType, Units };
