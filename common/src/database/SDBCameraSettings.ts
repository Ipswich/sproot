type SDBCameraSettings = {
  id: number;
  name: string;
  xVideoResolution: number | null;
  yVideoResolution: number | null;
  videoFps: number | null;
  xImageResolution: number | null;
  yImageResolution: number | null;
  imageRetentionDays: number;
  imageRetentionSize: number;
};

export type { SDBCameraSettings };
