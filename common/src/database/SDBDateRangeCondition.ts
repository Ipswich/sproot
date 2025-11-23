import { ConditionGroupType } from "@sproot/sproot-common/src/automation/ConditionTypes";

type SDBDateRangeCondition = {
  id: number;
  automationId: number;
  groupType: ConditionGroupType;
  startMonth: number;
  startDate: number;
  endMonth: number;
  endDate: number;
};

export type { SDBDateRangeCondition };
