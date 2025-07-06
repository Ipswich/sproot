export const Models = {
  "PCA9685": "PCA9685",
  "TPLINK_SMART_PLUG": "TPLINK_SMART_PLUG",
} as const

export const ModelList: Record<keyof typeof Models, string>= {
  [Models.PCA9685]: "PCA9685",
  [Models.TPLINK_SMART_PLUG]: "TPLink Smart Plug",
} as const;