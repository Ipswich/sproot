export function sensorAccordionOrderKey(readingType: string): string {
  return `${readingType}-sensorTableOrder`;
}

export function sensorToggledDeviceZonesKey(readingType: string): string {
  return `${readingType}-toggledDeviceZones`;
}

export function sensorDataOrderKey(
  readingType: string,
  deviceZone: number,
): string {
  return `${readingType}-${deviceZone}-sensorDataOrder`;
}

export function sensorsToggledKey(readingType: string): string {
  return `${readingType}-toggledSensors`;
}

export function outputZoneOrderKey(): string {
  return `outputZoneOrder`;
}

export function outputStateOrderKey(deviceZone: number): string {
  return `${deviceZone}-outputStateOrder`;
}

export function outputStateToggledZonesKey(): string {
  return `outputs-toggledDeviceZones`;
}
