export const Models = {
  PCA9685: "PCA9685",
  TPLINK_SMART_PLUG: "TPLINK_SMART_PLUG",
  ESP32_PCA9685: "ESP32_PCA9685",
  OUTPUT_GROUP: "OUTPUT_GROUP",
} as const;

export const ModelList: Record<keyof typeof Models, string> = {
  [Models.PCA9685]: "PCA9685",
  [Models.TPLINK_SMART_PLUG]: "TPLink Smart Plug",
  [Models.ESP32_PCA9685]: "ESP32 PCA9685",
  [Models.OUTPUT_GROUP]: "Output Group",
} as const;
