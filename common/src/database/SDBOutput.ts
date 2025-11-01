import { Models } from "@sproot/sproot-common/src/outputs/Models";

type SDBOutput = {
  id: number;
  model: keyof typeof Models;
  hostName: string | null;
  address: string;
  name: string;
  externalDeviceName: string | null;
  secureToken: string | null;
  pin: string;
  isPwm: boolean;
  isInvertedPwm: boolean;
  color: string;
  automationTimeout: number;
};

export type { SDBOutput };
