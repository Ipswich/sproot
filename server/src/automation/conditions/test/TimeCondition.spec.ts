import { TimeCondition } from "../TimeCondition";
import { derivePhaseAnchor, evaluateTimeRepeat, hasValidRepeatConfiguration } from "../ConditionUtils";

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

    it("should preserve legacy continuous behavior when repeat is not configured", () => {
      const timeCondition = new TimeCondition(1, "allOf", "08:00", "17:00", null, null);
      const now = new Date("2026-08-05T08:30:00");

      assert.isTrue(timeCondition.evaluate(now));
    });

    it("should evaluate repeating schedules inside a bounded window", () => {
      const timeCondition = new TimeCondition(
        1,
        "allOf",
        "08:00",
        "17:00",
        30,
        10,
        "default",
        null,
      );

      assert.isTrue(timeCondition.evaluate(new Date("2026-08-05T08:00:00")));
      assert.isTrue(timeCondition.evaluate(new Date("2026-08-05T08:09:00")));
      assert.isFalse(timeCondition.evaluate(new Date("2026-08-05T08:10:00")));
      assert.isFalse(timeCondition.evaluate(new Date("2026-08-05T08:29:00")));
      assert.isTrue(timeCondition.evaluate(new Date("2026-08-05T08:30:00")));
      assert.isFalse(timeCondition.evaluate(new Date("2026-08-05T17:00:00")));
    });

    it("should evaluate wrapping repeating schedules from the current window start", () => {
      const timeCondition = new TimeCondition(
        1,
        "allOf",
        "23:30",
        "04:00",
        17,
        5,
        "default",
        null,
      );

      assert.isTrue(timeCondition.evaluate(new Date("2026-08-05T23:30:00")));
      assert.isFalse(timeCondition.evaluate(new Date("2026-08-05T23:35:00")));
      assert.isTrue(timeCondition.evaluate(new Date("2026-08-05T23:47:00")));
      assert.isTrue(timeCondition.evaluate(new Date("2026-08-06T00:04:00")));
      assert.isFalse(timeCondition.evaluate(new Date("2026-08-06T00:09:00")));
    });

    it("should reject repeat patterns for once schedules", () => {
      const timeCondition = new TimeCondition(1, "allOf", "10:00", null, 10, 5, "default");
      assert.isFalse(timeCondition.evaluate(new Date("2026-08-05T10:00:00")));
    });

   it("should reject partial repeat configuration", () => {
        assert.isFalse(
          evaluateTimeRepeat(new Date("2026-08-05T10:00:00"), {
            id: 1,
            groupType: "allOf",
            startTime: "08:00",
            endTime: "17:00",
            repeatInterval: 10,
            repeatDuration: null,
          }),
        );
      });

    it("should reject when repeatDuration >= repeatInterval", () => {
      assert.isFalse(
        evaluateTimeRepeat(new Date("2026-08-05T10:00:00"), {
          id: 1,
          groupType: "allOf",
          startTime: "08:00",
          endTime: "17:00",
          repeatInterval: 30,
          repeatDuration: 30,
        }),
      );

      assert.isFalse(
        evaluateTimeRepeat(new Date("2026-08-05T10:00:00"), {
          id: 1,
          groupType: "allOf",
          startTime: "08:00",
          endTime: "17:00",
          repeatInterval: 30,
          repeatDuration: 45,
        }),
      );
    });
  });

  describe("hasValidRepeatConfiguration", () => {
    it("should reject when repeatDuration >= repeatInterval", () => {
      assert.isFalse(
        hasValidRepeatConfiguration({
          id: 1,
          groupType: "allOf",
          startTime: "08:00",
          endTime: "17:00",
          repeatInterval: 30,
          repeatDuration: 30,
        }),
      );

      assert.isFalse(
        hasValidRepeatConfiguration({
          id: 1,
          groupType: "allOf",
          startTime: "08:00",
          endTime: "17:00",
          repeatInterval: 30,
          repeatDuration: 45,
        }),
      );
    });

    it("should accept when repeatDuration < repeatInterval", () => {
      assert.isTrue(
        hasValidRepeatConfiguration({
          id: 1,
          groupType: "allOf",
          startTime: "08:00",
          endTime: "17:00",
          repeatInterval: 30,
          repeatDuration: 10,
        }),
      );
    });
  });

  describe("derivePhaseAnchor", () => {
    it("should default always schedules to the epoch", () => {
      const anchor = derivePhaseAnchor(
        {
          id: 1,
          groupType: "allOf",
          startTime: null,
          endTime: null,
          repeatInterval: 10,
          repeatDuration: 5,
          phaseAnchorType: "default",
        },
        new Date("2026-08-05T10:00:00"),
      );

      assert.isNotNull(anchor);
      assert.equal(anchor?.toISOString(), "1970-01-01T00:00:00.000Z");
    });

    it("should default between schedules to the current window start", () => {
      const anchor = derivePhaseAnchor(
        {
          id: 1,
          groupType: "allOf",
          startTime: "23:30",
          endTime: "04:00",
          repeatInterval: 17,
          repeatDuration: 5,
          phaseAnchorType: "default",
        },
        new Date("2026-08-06T00:04:00"),
      );

      assert.isNotNull(anchor);
      assert.equal(anchor?.getFullYear(), 2026);
      assert.equal(anchor?.getMonth(), 7);
      assert.equal(anchor?.getDate(), 5);
      assert.equal(anchor?.getHours(), 23);
      assert.equal(anchor?.getMinutes(), 30);
    });

    it("should derive clock anchors from the most recent wall-clock time", () => {
      const anchor = derivePhaseAnchor(
        {
          id: 1,
          groupType: "allOf",
          startTime: null,
          endTime: null,
          repeatInterval: 120,
          repeatDuration: 30,
          phaseAnchorType: "clock",
          phaseAnchorValue: "08:15",
        },
        new Date("2026-08-05T07:00:00"),
      );

      assert.isNotNull(anchor);
      assert.equal(anchor?.getFullYear(), 2026);
      assert.equal(anchor?.getMonth(), 7);
      assert.equal(anchor?.getDate(), 4);
      assert.equal(anchor?.getHours(), 8);
      assert.equal(anchor?.getMinutes(), 15);
    });

    it("should derive fixed anchors from absolute timestamps", () => {
      const anchor = derivePhaseAnchor(
        {
          id: 1,
          groupType: "allOf",
          startTime: null,
          endTime: null,
          repeatInterval: 120,
          repeatDuration: 30,
          phaseAnchorType: "fixed",
          phaseAnchorValue: "2026-08-01T12:00:00.000Z",
        },
        new Date("2026-08-05T07:00:00"),
      );

      assert.isNotNull(anchor);
      assert.equal(anchor?.toISOString(), "2026-08-01T12:00:00.000Z");
    });
  });
});
