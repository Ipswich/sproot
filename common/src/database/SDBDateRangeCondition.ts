import { ConditionGroupType } from "@sproot/sproot-common/src/automation/ConditionTypes";

type SDBDateRangeCondition = {
  id: number;
  automationId: number;
  groupType: ConditionGroupType;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
};

export type { SDBDateRangeCondition };
