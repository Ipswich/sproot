import { SprootDB } from "../../../database/SprootDB";
import { SDBTimeAutomationCondition } from "@sproot/database/SDBTimeAutomationCondition";
import { SDBOutputAutomationCondition } from "@sproot/database/SDBOutputAutomationCondition";
import { SDBSensorAutomationCondition } from "@sproot/database/SDBSensorAutomationCondition";
import { ReadingType } from "@sproot/sproot-common/src/sensors/ReadingType";
import { OutputList } from "../../../outputs/list/OutputList";
import { OutputBase } from "../../../outputs/base/OutputBase";
import { SensorList } from "../../../sensors/list/SensorList";
import { SensorBase } from "../../../sensors/base/SensorBase";

import { Conditions } from "../Conditions";

import { assert } from "chai";
import sinon from "sinon";

describe("Conditions.ts tests", () => {
  describe("evaluate", () => {
    it("should return true or false, depending on the condition and comparator", async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      const conditions = new Conditions(1, sprootDB);
      // Sensor stubs
      const sensor = sinon.createStubInstance(SensorBase);
      sensor.lastReading = { temperature: "50", humidity: "49", pressure: "51" };
      const sensorList = sinon.createStubInstance(SensorList);
      sinon.stub(sensorList, "sensors").value({ 1: sensor });
      // Output stubs
      const output = sinon.createStubInstance(OutputBase);
      sinon.stub(output, "value").value(50);
      const outputList = sinon.createStubInstance(OutputList);
      sinon.stub(outputList, "outputs").value({ 1: output });
      // Time stubs
      const now = new Date();
      now.setHours(12, 0);

      // No conditions should return false
      assert.isFalse(conditions.evaluate("and", sensorList, outputList, now));
      assert.isFalse(conditions.evaluate("or", sensorList, outputList, now));

      // Add some sensor Conditions
      sprootDB.addSensorAutomationConditionAsync.resolves(1);
      await conditions.addSensorConditionAsync("allOf", "equal", 50, 1, ReadingType.temperature);
      assert.isTrue(conditions.evaluate("and", sensorList, outputList, now));
      sprootDB.addSensorAutomationConditionAsync.resolves(2);
      await conditions.addSensorConditionAsync("allOf", "greater", 50, 1, ReadingType.pressure);
      assert.isTrue(conditions.evaluate("and", sensorList, outputList, now));
      //This one is false, but the previous one is true
      sprootDB.addSensorAutomationConditionAsync.resolves(3);
      await conditions.addSensorConditionAsync("allOf", "less", 48, 1, ReadingType.humidity);
      assert.isFalse(conditions.evaluate("and", sensorList, outputList, now));

      // Clean up that last one
      sprootDB.deleteSensorAutomationConditionAsync.resolves();
      conditions.deleteSensorConditionAsync(3);
      
      // Add some output Conditions
      sprootDB.addOutputAutomationConditionAsync.resolves(1);
      await conditions.addOutputConditionAsync("anyOf", "greaterOrEqual", 50, 1);
      assert.isTrue(conditions.evaluate("and", sensorList, outputList, now));
      //This one is false, but the previous one is true
      sprootDB.addOutputAutomationConditionAsync.resolves(2);
      await conditions.addOutputConditionAsync("anyOf", "notEqual", 50, 1);
      assert.isTrue(conditions.evaluate("and", sensorList, outputList, now));

      // Add some time Conditions
      sprootDB.addTimeAutomationConditionAsync.resolves(1);
      await conditions.addTimeConditionAsync("oneOf", "12:00", null);
      assert.isTrue(conditions.evaluate("and", sensorList, outputList, now));
      //This one is false, but the previous one is true
      sprootDB.addTimeAutomationConditionAsync.resolves(2);
      await conditions.addTimeConditionAsync("oneOf", "13:00", "14:00");
      assert.isTrue(conditions.evaluate("and", sensorList, outputList, now));
      //This one is also true (and should make this all return false)
      sprootDB.addTimeAutomationConditionAsync.resolves(3);
      await conditions.addTimeConditionAsync("oneOf", "16:00", "13:00");
      assert.isFalse(conditions.evaluate("and", sensorList, outputList, now));

      //But evaluating as "or" should return true
      assert.isTrue(conditions.evaluate("or", sensorList, outputList, now));
    });
  });

  describe("addSensorConditionAsync", () => {
    it("should add a sensor condition to the conditions list", async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.addSensorAutomationConditionAsync.resolves(1);

      const conditions = new Conditions(1, sprootDB);
      await conditions.addSensorConditionAsync("allOf", "equal", 50, 1, ReadingType.temperature);

      assert.equal(conditions.groupedConditions.sensor.allOf.length, 1);
      assert.equal(conditions.allOf.length, 1);
      assert.equal(conditions.groupedConditions.sensor.allOf[0]?.id, 1);
      assert.equal(conditions.groupedConditions.sensor.allOf[0]?.groupType, "allOf");
      assert.equal(conditions.groupedConditions.sensor.allOf[0]?.operator, "equal");
      assert.equal(conditions.groupedConditions.sensor.allOf[0]?.comparisonValue, 50);
      assert.equal(conditions.groupedConditions.sensor.allOf[0]?.sensorId, 1);
      assert.equal(conditions.groupedConditions.sensor.allOf[0]?.readingType, ReadingType.temperature);
    });
  });
  
  describe("addOutputConditionAsync", () => {
    it("should add an output condition to the conditions list", async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.addOutputAutomationConditionAsync.resolves(1);

      const conditions = new Conditions(1, sprootDB);
      await conditions.addOutputConditionAsync("anyOf", "equal", 50, 1);

      assert.equal(conditions.groupedConditions.output.anyOf.length, 1);
      assert.equal(conditions.anyOf.length, 1);
      assert.equal(conditions.groupedConditions.output.anyOf[0]?.id, 1);
      assert.equal(conditions.groupedConditions.output.anyOf[0]?.groupType, "anyOf");
      assert.equal(conditions.groupedConditions.output.anyOf[0]?.operator, "equal");
      assert.equal(conditions.groupedConditions.output.anyOf[0]?.comparisonValue, 50);
      assert.equal(conditions.groupedConditions.output.anyOf[0]?.outputId, 1);
    });
  });

  describe("addTimeConditionAsync", () => {
    it("should add a time condition to the conditions list", async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.addTimeAutomationConditionAsync.resolves(1);

      const conditions = new Conditions(1, sprootDB);
      await conditions.addTimeConditionAsync("oneOf", "00:00", "01:00");

      assert.equal(conditions.groupedConditions.time.oneOf.length, 1);
      assert.equal(conditions.oneOf.length, 1);
      assert.equal(conditions.groupedConditions.time.oneOf[0]?.id, 1);
      assert.equal(conditions.groupedConditions.time.oneOf[0]?.groupType, "oneOf");
      assert.equal(conditions.groupedConditions.time.oneOf[0]?.startTime, "00:00");
      assert.equal(conditions.groupedConditions.time.oneOf[0]?.endTime, "01:00");
    });
  });

  describe("updateConditionAsync", () => {
    it("should update a sensorCondition", async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.updateSensorAutomationConditionAsync.resolves();

      const conditions = new Conditions(1, sprootDB);
      const sensorCondition = await conditions.addSensorConditionAsync("allOf", "equal", 50, 1, ReadingType.temperature);

      sensorCondition.groupType = "anyOf";
      sensorCondition.operator = "greater";
      sensorCondition.comparisonValue = 60;
      sensorCondition.sensorId = 2;
      sensorCondition.readingType = ReadingType.humidity;
      await conditions.updateConditionAsync(sensorCondition);

      assert.equal(conditions.groupedConditions.sensor.anyOf[0]?.groupType, "anyOf");
      assert.equal(conditions.groupedConditions.sensor.anyOf[0]?.operator, "greater");
      assert.equal(conditions.groupedConditions.sensor.anyOf[0]?.comparisonValue, 60);
      assert.equal(conditions.groupedConditions.sensor.anyOf[0]?.sensorId, 2);
      assert.equal(conditions.groupedConditions.sensor.anyOf[0]?.readingType, ReadingType.humidity);
    });

    it("should update an outputCondition", async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.updateOutputAutomationConditionAsync.resolves();

      const conditions = new Conditions(1, sprootDB);
      const outputCondition = await conditions.addOutputConditionAsync("allOf", "equal", 50, 1);

      outputCondition.groupType = "anyOf";
      outputCondition.operator = "greater";
      outputCondition.comparisonValue = 60;
      outputCondition.outputId = 2;
      await conditions.updateConditionAsync(outputCondition);

      assert.equal(conditions.groupedConditions.output.anyOf[0]?.groupType, "anyOf");
      assert.equal(conditions.groupedConditions.output.anyOf[0]?.operator, "greater");
      assert.equal(conditions.groupedConditions.output.anyOf[0]?.comparisonValue, 60);
      assert.equal(conditions.groupedConditions.output.anyOf[0]?.outputId, 2);
    });

    it("should update a timeCondition", async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.updateTimeAutomationConditionAsync.resolves();

      const conditions = new Conditions(1, sprootDB);
      const timeCondition = await conditions.addTimeConditionAsync("allOf", "00:00", "01:00");

      timeCondition.groupType = "anyOf";
      timeCondition.startTime = "01:00";
      timeCondition.endTime = null;
      await conditions.updateConditionAsync(timeCondition);

      assert.equal(conditions.groupedConditions.time.anyOf[0]?.groupType, "anyOf");
      assert.equal(conditions.groupedConditions.time.anyOf[0]?.startTime, "01:00");
      assert.equal(conditions.groupedConditions.time.anyOf[0]?.endTime, null);
    });
  });

  describe("deleteSensorConditionAsync", () => {
    it("should delete a sensorCondition", async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.addSensorAutomationConditionAsync.resolves(1);
      sprootDB.deleteSensorAutomationConditionAsync.resolves();

      const conditions = new Conditions(1, sprootDB);
      const sensorCondition = await conditions.addSensorConditionAsync("allOf", "equal", 50, 1, ReadingType.temperature);

      await conditions.deleteSensorConditionAsync(sensorCondition.id);

      assert.equal(conditions.groupedConditions.sensor.allOf.length, 0);
      assert.equal(conditions.allOf.length, 0);
    });

    it("should not delete a sensorCondition that doesn't exist", async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.deleteSensorAutomationConditionAsync.resolves();

      const conditions = new Conditions(1, sprootDB);
      await conditions.deleteSensorConditionAsync(1);

      assert.equal(conditions.groupedConditions.sensor.allOf.length, 0);
      assert.equal(conditions.allOf.length, 0);
    });
  });

  describe("deleteOutputConditionAsync", () => {
    it("should delete an outputCondition", async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.addOutputAutomationConditionAsync.resolves(1);
      sprootDB.deleteOutputAutomationConditionAsync.resolves();

      const conditions = new Conditions(1, sprootDB);
      const outputCondition = await conditions.addOutputConditionAsync("allOf", "equal", 50, 1);

      await conditions.deleteOutputConditionAsync(outputCondition.id);

      assert.equal(conditions.groupedConditions.output.allOf.length, 0);
      assert.equal(conditions.allOf.length, 0);
    });

    it("should not delete an outputCondition that doesn't exist", async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.deleteOutputAutomationConditionAsync.resolves();

      const conditions = new Conditions(1, sprootDB);
      await conditions.deleteOutputConditionAsync(1);

      assert.equal(conditions.groupedConditions.output.allOf.length, 0);
      assert.equal(conditions.allOf.length, 0);
    });
  });

  describe("deleteTimeConditionAsync", () => {
    it("should delete a timeCondition", async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.addTimeAutomationConditionAsync.resolves(1);
      sprootDB.deleteTimeAutomationConditionAsync.resolves();

      const conditions = new Conditions(1, sprootDB);
      const timeCondition = await conditions.addTimeConditionAsync("allOf", "00:00", "01:00");

      await conditions.deleteTimeConditionAsync(timeCondition.id);

      assert.equal(conditions.groupedConditions.time.allOf.length, 0);
      assert.equal(conditions.allOf.length, 0);
    });

    it("should not delete a timeCondition that doesn't exist", async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.deleteTimeAutomationConditionAsync.resolves();

      const conditions = new Conditions(1, sprootDB);
      await conditions.deleteTimeConditionAsync(1);

      assert.equal(conditions.groupedConditions.time.allOf.length, 0);
      assert.equal(conditions.allOf.length, 0);
    });
  });

  describe("loadAsync", () => {
    it("should load all conditions from the database", async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getSensorAutomationConditionsAsync.resolves([
        { id: 1, groupType: "allOf", sensorId: 1, readingType: ReadingType.temperature, operator: "equal", comparisonValue: 50 } as SDBSensorAutomationCondition
      ]);
      sprootDB.getOutputAutomationConditionsAsync.resolves([
        { id: 1, groupType: "anyOf", outputId: 1, operator: "equal", comparisonValue: 50 } as SDBOutputAutomationCondition
      ]);
      sprootDB.getTimeAutomationConditionsAsync.resolves([
        { id: 1, groupType: "oneOf", startTime: "00:00", endTime: "01:00" } as SDBTimeAutomationCondition,
        { id: 2, groupType: "anyOf", startTime: "00:00", endTime: "01:00" } as SDBTimeAutomationCondition
      ]);

      const conditions = new Conditions(1, sprootDB);
      await conditions.loadAsync();

      assert.equal(conditions.groupedConditions.sensor.allOf.length, 1);
      assert.equal(conditions.groupedConditions.sensor.allOf[0]?.id, 1);
      assert.equal(conditions.groupedConditions.sensor.allOf[0]?.groupType, "allOf");
      assert.equal(conditions.groupedConditions.sensor.allOf[0]?.sensorId, 1);
      assert.equal(conditions.groupedConditions.sensor.allOf[0]?.readingType, ReadingType.temperature);
      assert.equal(conditions.groupedConditions.sensor.allOf[0]?.operator, "equal");
      assert.equal(conditions.groupedConditions.sensor.allOf[0]?.comparisonValue, 50);

      assert.equal(conditions.groupedConditions.output.anyOf.length, 1);
      assert.equal(conditions.groupedConditions.output.anyOf[0]?.id, 1);
      assert.equal(conditions.groupedConditions.output.anyOf[0]?.groupType, "anyOf");
      assert.equal(conditions.groupedConditions.output.anyOf[0]?.outputId, 1);
      assert.equal(conditions.groupedConditions.output.anyOf[0]?.operator, "equal");
      assert.equal(conditions.groupedConditions.output.anyOf[0]?.comparisonValue, 50);

      assert.equal(conditions.groupedConditions.time.oneOf.length, 1);
      assert.equal(conditions.groupedConditions.time.oneOf[0]?.id, 1);
      assert.equal(conditions.groupedConditions.time.oneOf[0]?.groupType, "oneOf");
      assert.equal(conditions.groupedConditions.time.oneOf[0]?.startTime, "00:00");
      assert.equal(conditions.groupedConditions.time.oneOf[0]?.endTime, "01:00");

      assert.equal(conditions.groupedConditions.time.anyOf.length, 1);
      assert.equal(conditions.groupedConditions.time.anyOf[0]?.id, 2);
      assert.equal(conditions.groupedConditions.time.anyOf[0]?.groupType, "anyOf");
      assert.equal(conditions.groupedConditions.time.anyOf[0]?.startTime, "00:00");
      assert.equal(conditions.groupedConditions.time.anyOf[0]?.endTime, "01:00");

      assert.equal(conditions.allOf.length, 1);
      assert.equal(conditions.anyOf.length, 2);
      assert.equal(conditions.oneOf.length, 1);
    });
  });
});