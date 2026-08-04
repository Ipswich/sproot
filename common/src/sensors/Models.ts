export const Models = {
  BME280: "BME280",
  CAPACITIVE_MOISTURE_SENSOR: "CAPACITIVE_MOISTURE_SENSOR",
  DS18B20: "DS18B20",
  ADS1115: "ADS1115",
  ESP32_BME280: "ESP32_BME280",
  ESP32_CAPACITIVE_MOISTURE_SENSOR: "ESP32_CAPACITIVE_MOISTURE_SENSOR",
  ESP32_DS18B20: "ESP32_DS18B20",
  ESP32_ADS1115: "ESP32_ADS1115",
} as const;

export const ModelList: Record<keyof typeof Models, string> = {
  [Models.BME280]: "BME280",
  [Models.CAPACITIVE_MOISTURE_SENSOR]: "Capacitive Moisture Sensor",
  [Models.DS18B20]: "DS18B20",
  [Models.ADS1115]: "ADS1115",
  [Models.ESP32_BME280]: "ESP32 BME280",
  [Models.ESP32_CAPACITIVE_MOISTURE_SENSOR]: "ESP32 Capacitive Moisture Sensor",
  [Models.ESP32_DS18B20]: "ESP32 DS18B20",
  [Models.ESP32_ADS1115]: "ESP32 ADS1115",
} as const;

export const I2C_SENSOR_ADDRESSES: Record<string, string[]> = {
  BME280: ["0x76", "0x77"],
  ESP32_BME280: ["0x76", "0x77"],
  ADS1115: ["0x48", "0x49", "0x4A", "0x4B"],
  ESP32_ADS1115: ["0x48", "0x49", "0x4A", "0x4B"],
  CAPACITIVE_MOISTURE_SENSOR: ["0x48", "0x49", "0x4A", "0x4B"],
  ESP32_CAPACITIVE_MOISTURE_SENSOR: ["0x48", "0x49", "0x4A", "0x4B"],
};

export const I2C_SENSOR_PINS: Record<string, string[]> = {
  ADS1115: ["0", "1", "2", "3"],
  ESP32_ADS1115: ["0", "1", "2", "3"],
  CAPACITIVE_MOISTURE_SENSOR: ["0", "1", "2", "3"],
  ESP32_CAPACITIVE_MOISTURE_SENSOR: ["0", "1", "2", "3"],
};
