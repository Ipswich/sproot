import { SDBOutputState } from "@sproot/sproot-common/src/database/SDBOutputState";
import { IQueueCacheable } from "@sproot/sproot-common/src/utility/QueueCache";
import { IChartable } from "@sproot/sproot-common/src/utility/IChartable";

enum ControlMode {
  manual = "manual",
  schedule = "schedule",
}

interface IOutputBase {
  id: number;
  model: string;
  address: string;
  name: string | null;
  pin: number;
  isPwm: boolean;
  isInvertedPwm: boolean;
  state: IOutputState;
  value?: number | undefined;
  controlMode?: ControlMode | undefined;
  cache?: IQueueCacheable<unknown> | undefined;
  chartData?: IChartable | undefined;
  color?: string | undefined;
}

interface IOutputState {
  manual: SDBOutputState;
  schedule: SDBOutputState;
  controlMode: ControlMode;
  value: number;
}

export { ControlMode };
export type { IOutputBase, IOutputState };
