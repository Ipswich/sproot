import { RowDataPacket } from "mysql2";
import { ConditionGroupType } from "@sproot/sproot-common/src/automation/ConditionTypes.js";

type SDBWeekdayCondition = RowDataPacket & {
  id: number;
  automationId: number;
  groupType: ConditionGroupType;
  weekdays: number;
};

export type { SDBWeekdayCondition };
