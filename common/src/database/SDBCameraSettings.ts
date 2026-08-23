type SDBCameraSettings = {
  id: number;
  enabled: boolean;
  name: string;
  captureUrl: string;
  streamUrl: string;
  healthUrl: string;
  timelapseEnabled: boolean;
  imageRetentionDays: number;
  imageRetentionSize: number;
  timelapseInterval: number | null;
  timelapseStartTime: string | null;
  timelapseStartOffsetSeconds?: number | null;
  timelapseEndTime: string | null;
  timelapseEndOffsetSeconds?: number | null;
};

export type { SDBCameraSettings };
