import ModelList from "../outputs/ModelList";

type SDBOutput = {
  id: number;
  model: ModelList;
  address: string;
  name: string;
  pin: string;
  isPwm: boolean;
  isInvertedPwm: boolean;
  color: string;
  automationTimeout: number;
};

export type { SDBOutput };
