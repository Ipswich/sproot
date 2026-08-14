export const DATABASE_NAME = "sproot";
export const MDNS_SERVICE_TYPE = "sproot-device";

// Cron Job Schedules
export const CRON = {
  EVERY_SECOND: "* * * * * *",
  EVERY_MINUTE: "0 * * * * *",
  DAILY_AT_MIDNIGHT: "0 0 0 * * *",
};

// Cache Constants
export const INITIAL_CACHE_LOOKBACK = 30;
export const MAX_CACHE_SIZE = 30;
export const CACHE_BUCKET_MINUTES = 1;

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

// Backup Constants
export const BACKUP_DIRECTORY = "./backups";

// Color Palette
export const DefaultColors = [
  "#82c91e",
  "#40c057",
  "#12b886",
  "#15aabf",
  "#228be6",
  "#4c6ef5",
  "#7950f2",
  "#be4bdb",
  "#e64980",
  "#fa5252",
  "#fd7e14",
  "#fab005",
  "#868e96",
  "#2e2e2e",
] as const;
