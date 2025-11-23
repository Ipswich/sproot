import { Models } from "@sproot/sproot-common/src/outputs/Models.js";

type SDBOutput = {
  id: number;
  model: keyof typeof Models;
  subcontrollerId: number | null;
  address: string;
  name: string;
  pin: string;
  isPwm: boolean;
  isInvertedPwm: boolean;
  color: string;
  automationTimeout: number;
};

export type { SDBOutput };
