import { Automation, isBetweenTimeStamp } from "../Automation";
import { SensorList } from "../../sensors/list/SensorList";
import { OutputList } from "../../outputs/list/OutputList";
import { OutputBase } from "../../outputs/base/OutputBase";
import { SensorBase } from "../../sensors/base/SensorBase";
import { SensorCondition } from "../conditions/SensorCondition";
import { ReadingType } from "@sproot/sproot-common/dist/sensors/ReadingType";
import { OutputCondition } from "../conditions/OutputCondition";

import { assert } from "chai";
import sinon from "sinon";
import { ConditionBase } from "../conditions/ConditionBase";

describe("Automation.ts tests", () => {
  describe("Automation", () => {
    describe("'constant' automations", () => {
      it("should handle an automation without conditions", () => {
        const sensorListMock = sinon.createStubInstance(SensorList);
        const outputListMock = sinon.createStubInstance(OutputList);
        const conditions = {
          allOf: [],
          anyOf: [],
          oneOf: [],
        };

        const automation = new Automation(50, "or", conditions);
        const now = new Date();

        now.setHours(10, 59);
        assert.isTrue(automation.evaluate(now, sensorListMock, outputListMock));
        now.setHours(11, 0);
        assert.isTrue(automation.evaluate(now, sensorListMock, outputListMock));
        now.setHours(11, 1);
        assert.isTrue(automation.evaluate(now, sensorListMock, outputListMock));
      });

      it("should handle an automation with conditions", () => {
        // Create a simple sensorList
        const sensorListMock = sinon.createStubInstance(SensorList);
        const sensorMock1 = sinon.createStubInstance(SensorBase);
        const sensorMock2 = sinon.createStubInstance(SensorBase);
        sinon.stub(sensorListMock, "sensors").value({ 1: sensorMock1, 2: sensorMock2 });
        sensorMock1.lastReading = { temperature: "51", humidity: "49", pressure: "51" };
        sensorMock2.lastReading = { temperature: "70", humidity: "49", pressure: "51" };

        // Create a simple OutputList
        const outputListMock = sinon.createStubInstance(OutputList);
        const outputMock = sinon.createStubInstance(OutputBase);
        sinon.stub(outputListMock, "outputs").value({ 1: outputMock });
        sinon.stub(outputMock, "value").value(51);

        let conditions = {
          allOf: [
            new SensorCondition(1, ReadingType.temperature, "greater", 50),
            new OutputCondition(1, "greater", 50),
          ] as ConditionBase[],
          anyOf: [] as ConditionBase[],
          oneOf: [] as ConditionBase[],
        };

        let automation = new Automation(50, "or", conditions);
        const early = new Date();
        early.setHours(0, 0);
        const late = new Date();
        late.setHours(12, 0);

        // OR
        // two true allOfs
        assert.isTrue(automation.evaluate(early, sensorListMock, outputListMock));
        assert.isTrue(automation.evaluate(late, sensorListMock, outputListMock));

        // make one of those allofs false
        conditions.allOf[1] = new OutputCondition(1, "equal", 50);
        assert.isFalse(automation.evaluate(early, sensorListMock, outputListMock));
        assert.isFalse(automation.evaluate(late, sensorListMock, outputListMock));

        // add a true any
        conditions.anyOf = [new SensorCondition(2, ReadingType.temperature, "less", 80)];
        assert.isTrue(automation.evaluate(early, sensorListMock, outputListMock));
        assert.isTrue(automation.evaluate(late, sensorListMock, outputListMock));

        // move that any to a oneOf
        conditions.anyOf = [];
        assert.isFalse(automation.evaluate(early, sensorListMock, outputListMock));
        assert.isFalse(automation.evaluate(late, sensorListMock, outputListMock));
        conditions.oneOf = [new SensorCondition(2, ReadingType.temperature, "less", 80)];
        assert.isTrue(automation.evaluate(early, sensorListMock, outputListMock));
        assert.isTrue(automation.evaluate(late, sensorListMock, outputListMock));

        // add a false oneOf
        conditions.oneOf.push(new OutputCondition(1, "less", 10));
        assert.isTrue(automation.evaluate(early, sensorListMock, outputListMock));
        assert.isTrue(automation.evaluate(late, sensorListMock, outputListMock));

        // add another true oneOf
        conditions.oneOf.push(new OutputCondition(1, "lessOrEqual", 51));
        assert.isFalse(automation.evaluate(early, sensorListMock, outputListMock));
        assert.isFalse(automation.evaluate(late, sensorListMock, outputListMock));

        //AND (reset)
        conditions = {
          allOf: [
            new SensorCondition(1, ReadingType.temperature, "greater", 50),
            new OutputCondition(1, "greater", 50),
          ] as ConditionBase[],
          anyOf: [] as ConditionBase[],
          oneOf: [] as ConditionBase[],
        };
        automation = new Automation(50, "and", conditions);

        // two true allOfs
        assert.isTrue(automation.evaluate(early, sensorListMock, outputListMock));
        assert.isTrue(automation.evaluate(late, sensorListMock, outputListMock));

        // add a false anyOf
        conditions.anyOf.push(
          new SensorCondition(1, ReadingType.temperature, "greaterOrEqual", 100),
        );
        assert.isFalse(automation.evaluate(early, sensorListMock, outputListMock));
        assert.isFalse(automation.evaluate(late, sensorListMock, outputListMock));
        // make it a true anyOf
        conditions.anyOf[0]!.operator = "notEqual";
        assert.isTrue(automation.evaluate(early, sensorListMock, outputListMock));
        assert.isTrue(automation.evaluate(late, sensorListMock, outputListMock));

        //add a false oneOf
        conditions.oneOf.push(new OutputCondition(1, "less", 10));
        assert.isFalse(automation.evaluate(early, sensorListMock, outputListMock));
        assert.isFalse(automation.evaluate(late, sensorListMock, outputListMock));
        //make it a true oneOf
        conditions.oneOf[0]!.operator = "greaterOrEqual";
        assert.isTrue(automation.evaluate(early, sensorListMock, outputListMock));
        assert.isTrue(automation.evaluate(late, sensorListMock, outputListMock));
        // add a second true oneOf
        conditions.oneOf.push(new OutputCondition(1, "notEqual", 10));
        assert.isFalse(automation.evaluate(early, sensorListMock, outputListMock));
        assert.isFalse(automation.evaluate(late, sensorListMock, outputListMock));
      });
    });

    describe("'bounded' automations", () => {
      it("should handle an automation without conditions", () => {
        const sensorListMock = sinon.createStubInstance(SensorList);
        const outputListMock = sinon.createStubInstance(OutputList);
        const conditions = {
          allOf: [],
          anyOf: [],
          oneOf: [],
        };

        const automation = new Automation(50, "or", conditions, "11:00", "2:00");
        const now = new Date();

        //Before start
        now.setHours(10, 59);
        assert.isFalse(automation.evaluate(now, sensorListMock, outputListMock));
        //Include start
        now.setHours(11, 0);
        assert.isTrue(automation.evaluate(now, sensorListMock, outputListMock));
        //Middle of timeframe
        now.setHours(18, 30);
        //Exclude end
        now.setHours(2, 0);
        assert.isFalse(automation.evaluate(now, sensorListMock, outputListMock));
      });

      it("should handle an automation with conditions", () => {
        // Create a simple sensorList
        const sensorListMock = sinon.createStubInstance(SensorList);
        const sensorMock1 = sinon.createStubInstance(SensorBase);
        const sensorMock2 = sinon.createStubInstance(SensorBase);
        sinon.stub(sensorListMock, "sensors").value({ 1: sensorMock1, 2: sensorMock2 });
        sensorMock1.lastReading = { temperature: "51", humidity: "49", pressure: "51" };
        sensorMock2.lastReading = { temperature: "70", humidity: "49", pressure: "51" };

        // Create a simple OutputList
        const outputListMock = sinon.createStubInstance(OutputList);
        const outputMock = sinon.createStubInstance(OutputBase);
        sinon.stub(outputListMock, "outputs").value({ 1: outputMock });
        sinon.stub(outputMock, "value").value(51);

        let conditions = {
          allOf: [
            new SensorCondition(1, ReadingType.temperature, "greater", 50),
            new OutputCondition(1, "greater", 50),
          ] as ConditionBase[],
          anyOf: [] as ConditionBase[],
          oneOf: [] as ConditionBase[],
        };

        let automation = new Automation(50, "or", conditions, "11:00", "2:00");
        const early = new Date();
        early.setHours(10, 59);
        const start = new Date();
        start.setHours(11, 0);
        const middle = new Date();
        middle.setHours(18, 30);
        const late = new Date();
        late.setHours(2, 0);

        // OR
        // two true allOfs
        assert.isFalse(automation.evaluate(early, sensorListMock, outputListMock));
        assert.isTrue(automation.evaluate(start, sensorListMock, outputListMock));
        assert.isTrue(automation.evaluate(middle, sensorListMock, outputListMock));
        assert.isFalse(automation.evaluate(late, sensorListMock, outputListMock));

        // make one of those allofs false
        conditions.allOf[1] = new OutputCondition(1, "equal", 50);
        assert.isFalse(automation.evaluate(early, sensorListMock, outputListMock));
        assert.isFalse(automation.evaluate(start, sensorListMock, outputListMock));
        assert.isFalse(automation.evaluate(middle, sensorListMock, outputListMock));
        assert.isFalse(automation.evaluate(late, sensorListMock, outputListMock));

        // add a true any
        conditions.anyOf = [new SensorCondition(2, ReadingType.temperature, "less", 80)];
        assert.isFalse(automation.evaluate(early, sensorListMock, outputListMock));
        assert.isTrue(automation.evaluate(start, sensorListMock, outputListMock));
        assert.isTrue(automation.evaluate(middle, sensorListMock, outputListMock));
        assert.isFalse(automation.evaluate(late, sensorListMock, outputListMock));

        // move that any to a oneOf
        conditions.anyOf = [];
        assert.isFalse(automation.evaluate(early, sensorListMock, outputListMock));
        assert.isFalse(automation.evaluate(start, sensorListMock, outputListMock));
        assert.isFalse(automation.evaluate(middle, sensorListMock, outputListMock));
        assert.isFalse(automation.evaluate(late, sensorListMock, outputListMock));
        conditions.oneOf = [new SensorCondition(2, ReadingType.temperature, "less", 80)];
        assert.isFalse(automation.evaluate(early, sensorListMock, outputListMock));
        assert.isTrue(automation.evaluate(start, sensorListMock, outputListMock));
        assert.isTrue(automation.evaluate(middle, sensorListMock, outputListMock));
        assert.isFalse(automation.evaluate(late, sensorListMock, outputListMock));

        // add a false oneOf
        conditions.oneOf.push(new OutputCondition(1, "less", 10));
        assert.isFalse(automation.evaluate(early, sensorListMock, outputListMock));
        assert.isTrue(automation.evaluate(start, sensorListMock, outputListMock));
        assert.isTrue(automation.evaluate(middle, sensorListMock, outputListMock));
        assert.isFalse(automation.evaluate(late, sensorListMock, outputListMock));

        // add another true oneOf
        conditions.oneOf.push(new OutputCondition(1, "lessOrEqual", 51));
        assert.isFalse(automation.evaluate(early, sensorListMock, outputListMock));
        assert.isFalse(automation.evaluate(start, sensorListMock, outputListMock));
        assert.isFalse(automation.evaluate(middle, sensorListMock, outputListMock));
        assert.isFalse(automation.evaluate(late, sensorListMock, outputListMock));

        //AND (reset)
        conditions = {
          allOf: [
            new SensorCondition(1, ReadingType.temperature, "greater", 50),
            new OutputCondition(1, "greater", 50),
          ] as ConditionBase[],
          anyOf: [] as ConditionBase[],
          oneOf: [] as ConditionBase[],
        };
        automation = new Automation(50, "and", conditions, "11:00", "2:00");

        // two true allOfs
        assert.isFalse(automation.evaluate(early, sensorListMock, outputListMock));
        assert.isTrue(automation.evaluate(start, sensorListMock, outputListMock));
        assert.isTrue(automation.evaluate(middle, sensorListMock, outputListMock));
        assert.isFalse(automation.evaluate(late, sensorListMock, outputListMock));

        // add a false anyOf
        conditions.anyOf.push(
          new SensorCondition(1, ReadingType.temperature, "greaterOrEqual", 100),
        );
        assert.isFalse(automation.evaluate(early, sensorListMock, outputListMock));
        assert.isFalse(automation.evaluate(start, sensorListMock, outputListMock));
        assert.isFalse(automation.evaluate(middle, sensorListMock, outputListMock));
        assert.isFalse(automation.evaluate(late, sensorListMock, outputListMock));
        // make it a true anyOf
        conditions.anyOf[0]!.operator = "notEqual";
        assert.isFalse(automation.evaluate(early, sensorListMock, outputListMock));
        assert.isTrue(automation.evaluate(start, sensorListMock, outputListMock));
        assert.isTrue(automation.evaluate(middle, sensorListMock, outputListMock));
        assert.isFalse(automation.evaluate(late, sensorListMock, outputListMock));

        //add a false oneOf
        conditions.oneOf.push(new OutputCondition(1, "less", 10));
        assert.isFalse(automation.evaluate(early, sensorListMock, outputListMock));
        assert.isFalse(automation.evaluate(start, sensorListMock, outputListMock));
        assert.isFalse(automation.evaluate(middle, sensorListMock, outputListMock));
        assert.isFalse(automation.evaluate(late, sensorListMock, outputListMock));
        //make it a true oneOf
        conditions.oneOf[0]!.operator = "greaterOrEqual";
        assert.isFalse(automation.evaluate(early, sensorListMock, outputListMock));
        assert.isTrue(automation.evaluate(start, sensorListMock, outputListMock));
        assert.isTrue(automation.evaluate(middle, sensorListMock, outputListMock));
        assert.isFalse(automation.evaluate(late, sensorListMock, outputListMock));
        // add a second true oneOf
        conditions.oneOf.push(new OutputCondition(1, "notEqual", 10));
        assert.isFalse(automation.evaluate(early, sensorListMock, outputListMock));
        assert.isFalse(automation.evaluate(start, sensorListMock, outputListMock));
        assert.isFalse(automation.evaluate(middle, sensorListMock, outputListMock));
        assert.isFalse(automation.evaluate(late, sensorListMock, outputListMock));
      });
    });
    describe("'now' automations", () => {
      it("should handle an automation without conditions", () => {
        const sensorListMock = sinon.createStubInstance(SensorList);
        const outputListMock = sinon.createStubInstance(OutputList);
        const conditions = {
          allOf: [],
          anyOf: [],
          oneOf: [],
        };

        const automation = new Automation(50, "or", conditions, "11:00");
        const now = new Date();

        now.setHours(10, 59);
        assert.isFalse(automation.evaluate(now, sensorListMock, outputListMock));
        now.setHours(11, 0);
        assert.isTrue(automation.evaluate(now, sensorListMock, outputListMock));
        now.setHours(11, 1);
        assert.isFalse(automation.evaluate(now, sensorListMock, outputListMock));
      });

      it("should handle an automation with conditions", () => {
        // Create a simple sensorList
        const sensorListMock = sinon.createStubInstance(SensorList);
        const sensorMock1 = sinon.createStubInstance(SensorBase);
        const sensorMock2 = sinon.createStubInstance(SensorBase);
        sinon.stub(sensorListMock, "sensors").value({ 1: sensorMock1, 2: sensorMock2 });
        sensorMock1.lastReading = { temperature: "51", humidity: "49", pressure: "51" };
        sensorMock2.lastReading = { temperature: "70", humidity: "49", pressure: "51" };

        // Create a simple OutputList
        const outputListMock = sinon.createStubInstance(OutputList);
        const outputMock = sinon.createStubInstance(OutputBase);
        sinon.stub(outputListMock, "outputs").value({ 1: outputMock });
        sinon.stub(outputMock, "value").value(51);

        let conditions = {
          allOf: [
            new SensorCondition(1, ReadingType.temperature, "greater", 50),
            new OutputCondition(1, "greater", 50),
          ] as ConditionBase[],
          anyOf: [] as ConditionBase[],
          oneOf: [] as ConditionBase[],
        };

        let automation = new Automation(50, "or", conditions, "11:00");
        const now = new Date();

        // OR
        // two true allOfs
        now.setHours(10, 59);
        assert.isFalse(automation.evaluate(now, sensorListMock, outputListMock));
        now.setHours(11, 0);
        assert.isTrue(automation.evaluate(now, sensorListMock, outputListMock));

        // make one of those allofs false
        conditions.allOf[1] = new OutputCondition(1, "equal", 50);
        assert.isFalse(automation.evaluate(now, sensorListMock, outputListMock));

        // add a true any
        conditions.anyOf = [new SensorCondition(2, ReadingType.temperature, "less", 80)];
        assert.isTrue(automation.evaluate(now, sensorListMock, outputListMock));

        // move that any to a oneOf
        conditions.anyOf = [];
        assert.isFalse(automation.evaluate(now, sensorListMock, outputListMock));
        conditions.oneOf = [new SensorCondition(2, ReadingType.temperature, "less", 80)];
        assert.isTrue(automation.evaluate(now, sensorListMock, outputListMock));

        // add a false oneOf
        conditions.oneOf.push(new OutputCondition(1, "less", 10));
        assert.isTrue(automation.evaluate(now, sensorListMock, outputListMock));

        // add another true oneOf
        conditions.oneOf.push(new OutputCondition(1, "lessOrEqual", 51));
        assert.isFalse(automation.evaluate(now, sensorListMock, outputListMock));

        //AND (reset)
        conditions = {
          allOf: [
            new SensorCondition(1, ReadingType.temperature, "greater", 50),
            new OutputCondition(1, "greater", 50),
          ] as ConditionBase[],
          anyOf: [] as ConditionBase[],
          oneOf: [] as ConditionBase[],
        };
        automation = new Automation(50, "and", conditions, "11:00");

        // two true allOfs
        now.setHours(10, 59);
        assert.isFalse(automation.evaluate(now, sensorListMock, outputListMock));
        now.setHours(11, 0);
        assert.isTrue(automation.evaluate(now, sensorListMock, outputListMock));

        // add a false anyOf
        conditions.anyOf.push(
          new SensorCondition(1, ReadingType.temperature, "greaterOrEqual", 100),
        );
        assert.isFalse(automation.evaluate(now, sensorListMock, outputListMock));
        // make it a true anyOf
        conditions.anyOf[0]!.operator = "notEqual";
        assert.isTrue(automation.evaluate(now, sensorListMock, outputListMock));

        //add a false oneOf
        conditions.oneOf.push(new OutputCondition(1, "less", 10));
        assert.isFalse(automation.evaluate(now, sensorListMock, outputListMock));
        //make it a true oneOf
        conditions.oneOf[0]!.operator = "greaterOrEqual";
        assert.isTrue(automation.evaluate(now, sensorListMock, outputListMock));
        // add a second true oneOf
        conditions.oneOf.push(new OutputCondition(1, "notEqual", 10));
        assert.isFalse(automation.evaluate(now, sensorListMock, outputListMock));
      });
    });
  });

  describe("isBetweenTimeStamp", () => {
    it("should return true if the current time is between the start and end time", () => {
      const startTime = "10:00";
      const endTime = "12:00";
      const now = new Date("2021-01-01T11:00:00");

      const result = isBetweenTimeStamp(startTime, endTime, now);

      assert.isTrue(result);
    });

    it("should return false if the current time is before the start time", () => {
      const startTime = "10:00";
      const endTime = "12:00";
      const now = new Date("2021-01-01T09:00:00");

      const result = isBetweenTimeStamp(startTime, endTime, now);

      assert.isFalse(result);
    });

    it("should return false if the current time is after the end time", () => {
      const startTime = "10:00";
      const endTime = "12:00";
      const now = new Date("2021-01-01T13:00:00");

      const result = isBetweenTimeStamp(startTime, endTime, now);

      assert.isFalse(result);
    });

    it("should return true if the current time is between the start and end time, crossing midnight", () => {
      const startTime = "22:00";
      const endTime = "02:00";
      const now = new Date("2021-01-01T23:00:00");

      const result = isBetweenTimeStamp(startTime, endTime, now);

      assert.isTrue(result);
    });

    it("should return false if the current time is before the start time, crossing midnight", () => {
      const startTime = "22:00";
      const endTime = "02:00";
      const now = new Date("2021-01-01T21:00:00");

      const result = isBetweenTimeStamp(startTime, endTime, now);

      assert.isFalse(result);
    });

    it("should return false if the current time is after the end time, crossing midnight", () => {
      const startTime = "22:00";
      const endTime = "02:00";
      const now = new Date("2021-01-01T03:00:00");

      const result = isBetweenTimeStamp(startTime, endTime, now);
      assert.isFalse(result);
    });
  });
});
