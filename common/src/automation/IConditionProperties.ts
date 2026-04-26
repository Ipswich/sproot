import { ReadingType } from "../sensors/ReadingType";
import { ConditionOperator } from "./ConditionTypes";

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
      endTime?: string | null | undefined;
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
