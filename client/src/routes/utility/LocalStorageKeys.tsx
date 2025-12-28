
export function sensorAccordionOrderKey(readingType: string): string {
  return `${readingType}-sensorTableOrder`;
}

export function sensorToggledDeviceGroupsKey(readingType: string): string {
  return `${readingType}-toggledDeviceGroups`;
}

export function sensorDataOrderKey(readingType: string, deviceGroup: number): string {
  return `${readingType}-${deviceGroup}-sensorDataOrder`;
}

export function sensorsToggledKey(readingType: string): string {
  return `${readingType}-toggledSensors`;
}