type SDBCamera = {
  id: number;
  name: string;
  deviceIdentifier: string;
  resolution: string;
  quality: number;
  overlayTimestamp: boolean;
  overlayName: boolean;
  overlayColor: string;
  retentionDays: number;
  frequencyMinutes: number;
}

export type { SDBCamera };