import { ConditionGroupType } from "@sproot/sproot-common/src/automation/ConditionTypes";

type SDBTimeCondition = {
  id: number;
  automationId: number;
  groupType: ConditionGroupType;
  startTime: string | null;
  endTime: string | null;
};

export type { SDBTimeCondition };
