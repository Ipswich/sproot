type SDBCameraSettings = {
  id: number;
  enabled: boolean;
  name: string;
  xVideoResolution: number | null;
  yVideoResolution: number | null;
  videoFps: number | null;
  xImageResolution: number | null;
  yImageResolution: number | null;
  timelapseEnabled: boolean;
  imageRetentionDays: number;
  imageRetentionSize: number;
  timelapseInterval: number | null;
  timelapseStartTime: string | null;
  timelapseEndTime: string | null;
};

export type { SDBCameraSettings };
