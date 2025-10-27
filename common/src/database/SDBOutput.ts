import { Models } from "@sproot/sproot-common/src/outputs/Models";

type SDBOutput = {
  id: number;
  model: keyof typeof Models;
  externalAddress: string | null;
  address: string;
  name: string;
  pin: string;
  isPwm: boolean;
  isInvertedPwm: boolean;
  color: string;
  automationTimeout: number;
};

export type { SDBOutput };
