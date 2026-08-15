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
  timelapseEndTime: string | null;
};

export type { SDBCameraSettings };
