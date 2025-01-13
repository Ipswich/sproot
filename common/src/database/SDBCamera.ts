type SDBCamera = {
  id: number;
  name: string;
  deviceIdentifier: string;
  resolution: string;
  overlayTimestamp: boolean;
  overlayName: boolean;
  overlayColor: string;
  retentionDays: number;
  frequencyMinutes: number;
}

export type { SDBCamera };