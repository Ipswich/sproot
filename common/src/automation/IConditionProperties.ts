import { ReadingType } from "../sensors/ReadingType";
import { ConditionOperator } from "./ConditionTypes";
import { TimeConditionPhaseAnchorType } from "./ITimeCondition";

export type IConditionProperties =
  | {
      kind: "sensor";
      id: number;
      sensorId: number;
      readingType: ReadingType;
      operator: ConditionOperator;
      comparisonValue: number;
      comparisonLookback: number | null;
    }
  | {
      kind: "output";
      id: number;
      outputId: number;
      operator: ConditionOperator;
      comparisonValue: number;
      comparisonLookback: number | null;
    }
  | {
      kind: "time";
      id: number;
      startTime?: string | null | undefined;
      startOffsetSeconds?: number | null | undefined;
      endTime?: string | null | undefined;
      endOffsetSeconds?: number | null | undefined;
      repeatInterval?: number | null | undefined;
      repeatDuration?: number | null | undefined;
      phaseAnchorType?: TimeConditionPhaseAnchorType | null | undefined;
      phaseAnchorValue?: string | null | undefined;
    }
  | {
      kind: "weekday";
      id: number;
      weekdays: number;
    }
  | {
      kind: "month";
      id: number;
      months: number;
    }
  | {
      kind: "dateRange";
      id: number;
      startMonth: number;
      startDate: number;
      endMonth: number;
      endDate: number;
    };
