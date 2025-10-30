export const DATABASE_NAME = "sproot";

// Cron Job Schedules
export const CRON = {
  EVERY_SECOND: "* * * * * *",
  EVERY_MINUTE: "0 * * * * *",
};

// Cache Constants
export const INITIAL_CACHE_LOOKBACK = 10080;
export const MAX_CACHE_SIZE = 10080;

// Chart Constants
export const CHART_DATA_POINT_INTERVAL = 5; // minutes between each data point
export const MAX_CHART_DATA_POINTS = 2016; // 7 days of 5 minute intervals (24 * 60 * 7 / 5)

// Static Resources
export const STATIC_RESOURCES_DIRECTORY = "./static";

// Camera Constants
export const IMAGE_DIRECTORY = "./images";
export const TIMELAPSE_DIRECTORY = `${IMAGE_DIRECTORY}/timelapse`;
export const TIMELAPSE_RESOURCES = `${STATIC_RESOURCES_DIRECTORY}/timelapse`;
export const ARCHIVE_DIRECTORY = `${IMAGE_DIRECTORY}/archive`;

// Firmware Constants
export const FIRMWARE_DIRECTORY = `${STATIC_RESOURCES_DIRECTORY}/firmware`;
export const ESP32_MANIFEST_PATH = `${FIRMWARE_DIRECTORY}/esp32/manifest.json`;
export const ESP32_BOOTLOADER_PATH = `${FIRMWARE_DIRECTORY}/esp32/bootloader.bin`;
export const ESP32_PARTITIONS_PATH = `${FIRMWARE_DIRECTORY}/esp32/partitions.bin`;
export const ESP32_BOOTAPP0_PATH = `${FIRMWARE_DIRECTORY}/esp32/boot_app0.bin`;
export const ESP32_FIRMWARE_PATH = `${FIRMWARE_DIRECTORY}/esp32/firmware.bin`;

// Certificates Constants
export const CERTS_DIRECTORY = "./certs";
export const CA_DIR = `${CERTS_DIRECTORY}/ca`;
export const CA_KEY_PATH = `${CA_DIR}/ca.key.pem`;
export const CA_CERT_PATH = `${CA_DIR}/ca.crt.pem`;
