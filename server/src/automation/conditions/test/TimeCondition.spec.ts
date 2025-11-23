import { TimeCondition } from "../TimeCondition.js";

import { assert } from "chai";

describe("TimeCondition.ts tests", () => {
  describe("evaluate", () => {
    it("should always return true (no startTime or endTime)", () => {
      const timeCondition = new TimeCondition(1, "allOf");
      const now = new Date();
      assert.isTrue(timeCondition.evaluate(now));

      now.setHours(10);
      assert.isTrue(timeCondition.evaluate(now));

      now.setHours(22);
      assert.isTrue(timeCondition.evaluate(now));
    });

    it("should return true if now is between startTime and endTime", () => {
      const timeCondition = new TimeCondition(1, "allOf", "10:00", "12:00");
      const now = new Date();
      now.setHours(9);
      now.setMinutes(0);
      assert.isFalse(timeCondition.evaluate(now));

      //inclusive start
      now.setHours(10);
      assert.isTrue(timeCondition.evaluate(now));

      now.setHours(11);
      assert.isTrue(timeCondition.evaluate(now));

      //exclusive end
      now.setHours(12);
      assert.isFalse(timeCondition.evaluate(now));

      const wrappingTimeCondition = new TimeCondition(1, "allOf", "22:00", "02:00");
      now.setHours(21);
      assert.isFalse(wrappingTimeCondition.evaluate(now));

      //inclusive start
      now.setHours(22);
      assert.isTrue(wrappingTimeCondition.evaluate(now));

      now.setHours(23);
      assert.isTrue(wrappingTimeCondition.evaluate(now));

      //exclusive end
      now.setHours(2);
      assert.isFalse(wrappingTimeCondition.evaluate(now));
    });

    it("should return true if startTime is now (only startTime)", () => {
      const timeCondition = new TimeCondition(1, "allOf", "10:09");
      const now = new Date();
      now.setHours(10);

      now.setMinutes(8);
      assert.isFalse(timeCondition.evaluate(now));

      now.setMinutes(9);
      assert.isTrue(timeCondition.evaluate(now));

      now.setMinutes(10);
      assert.isFalse(timeCondition.evaluate(now));
    });

    it("should return false if startTime or endTime is not in the correct format", () => {
      const timeCondition = new TimeCondition(1, "allOf", "10:00");
      const now = new Date();
      now.setHours(10);
      now.setMinutes(0);

      timeCondition.startTime = "10:0";
      assert.isFalse(timeCondition.evaluate(now));

      timeCondition.startTime = "10:00";
      timeCondition.endTime = "12:0";
      assert.isFalse(timeCondition.evaluate(now));
    });

    it("should return false if there's only endTime", () => {
      const timeCondition = new TimeCondition(1, "allOf", null, "12:00");
      const now = new Date();
      now.setHours(10);
      now.setMinutes(0);

      assert.isFalse(timeCondition.evaluate(now));
    });
  });
});
