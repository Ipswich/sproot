import { MonthCondition } from "../MonthCondition";

import { assert } from "chai";

describe("MonthCondition.ts tests", () => {
  describe("evaluate", () => {
    it("should return true if now's integer month is within the provided number", () => {
      // January
      const now = new Date("2020-01-06T00:00:00Z");

      // No Months
      let monthCondition = new MonthCondition(1, "allOf", 0);
      assert.isFalse(monthCondition.evaluate(now), "No Months");

      // January
      monthCondition = new MonthCondition(1, "allOf", 1);
      assert.isTrue(monthCondition.evaluate(now), "January");

      // January and March
      monthCondition = new MonthCondition(1, "allOf", 5);
      assert.isTrue(monthCondition.evaluate(now), "January and March");

      // Just March
      monthCondition = new MonthCondition(1, "allOf", 4);
      assert.isFalse(monthCondition.evaluate(now), "March");

      // January, February, March, October, November, December
      monthCondition = new MonthCondition(1, "allOf", 3591);
      assert.isTrue(
        monthCondition.evaluate(now),
        "January, February, March, October, November, December",
      );

      // remove January
      monthCondition = new MonthCondition(1, "allOf", 3590);
      assert.isFalse(monthCondition.evaluate(now), "February, March, October, November, December");
    });
  });
});
