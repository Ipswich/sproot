export const Models = {
  BME280: "BME280",
  CAPACITIVE_MOISTURE_SENSOR: "CAPACITIVE_MOISTURE_SENSOR",
  DS18B20: "DS18B20",
  ADS1115: "ADS1115",
} as const;

export const ModelList: Record<keyof typeof Models, string> = {
  BME280: "BME280",
  CAPACITIVE_MOISTURE_SENSOR: "Capacitive Moisture Sensor",
  DS18B20: "DS18B20",
  ADS1115: "ADS1115",
} as const;
