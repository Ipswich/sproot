import { ConditionGroupType } from "@sproot/sproot-common/src/automation/ConditionTypes";

type SDBMonthCondition = {
  id: number;
  automationId: number;
  groupType: ConditionGroupType;
  months: number;
};

export type { SDBMonthCondition };
