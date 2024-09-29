import { RowDataPacket } from "mysql2";
import { ConditionGroupType } from "@sproot/sproot-common/src/automation/ConditionTypes";

type SDBTimeCondition = RowDataPacket & {
  id: number;
  automationId: number;
  groupType: ConditionGroupType;
  startTime: string | null;
  endTime: string | null;
};

export type { SDBTimeCondition };
