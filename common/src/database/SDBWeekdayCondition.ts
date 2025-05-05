import { ConditionGroupType } from "@sproot/sproot-common/src/automation/ConditionTypes";

type SDBWeekdayCondition = {
  id: number;
  automationId: number;
  groupType: ConditionGroupType;
  weekdays: number;
};

export type { SDBWeekdayCondition };
