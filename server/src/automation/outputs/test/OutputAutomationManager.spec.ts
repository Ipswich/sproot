import { ReadingType } from "@sproot/sproot-common/dist/sensors/ReadingType";
import OutputAutomationManager from "../OutputAutomationManager";

import { assert } from "chai";
import sinon from "sinon";
import { SDBTimeCondition } from "@sproot/sproot-common/dist/database/SDBTimeCondition";
import { SDBOutputCondition } from "@sproot/sproot-common/dist/database/SDBOutputCondition";
import { SDBSensorCondition } from "@sproot/sproot-common/dist/database/SDBSensorCondition";
import { SDBOutputActionView } from "@sproot/sproot-common/dist/database/SDBOutputAction";
import { OutputList } from "../../../outputs/list/OutputList";
import { SensorList } from "../../../sensors/list/SensorList";
import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";

describe("OutputAutomationManager.ts tests", () => {
  describe("evaluate", () => {
    it("should return the automation's value (conditions met)", async () => {
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      const automationManager = new OutputAutomationManager(sprootDB);
      const sensorListMock = sinon.createStubInstance(SensorList);
      const outputListMock = sinon.createStubInstance(OutputList);

      sprootDB.getAutomationsForOutputAsync.resolves([
        {
          automationId: 1,
          actionId: "1",
          name: "test",
          outputId: "1",
          value: 75,
          operator: "or",
        } as SDBOutputActionView,
      ]);

      sprootDB.getSensorConditionsAsync.resolves([]);
      sprootDB.getOutputConditionsAsync.resolves([]);
      sprootDB.getTimeConditionsAsync.onFirstCall().resolves([
        {
          id: 1,
          automationId: 1,
          groupType: "allOf",
          startTime: null,
          endTime: null,
        } as SDBTimeCondition,
      ]);
      sprootDB.getWeekdayConditionsAsync.resolves([]);

      await automationManager.loadAsync(1);
      const result = await automationManager.evaluateAsync(sensorListMock, outputListMock, 60);
      assert.equal(result?.names.length, 1);
      assert.equal(result?.names[0], "test");
      assert.equal(result?.value, 75);
    });

    it("should return the last result (not runnable)", async () => {
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      const automationManager = new OutputAutomationManager(sprootDB);
      const sensorListMock = sinon.createStubInstance(SensorList);
      const outputListMock = sinon.createStubInstance(OutputList);

      const now = new Date();

      sprootDB.getAutomationsForOutputAsync.resolves([
        {
          automationId: 1,
          actionId: "1",
          name: "test",
          outputId: "1",
          value: 75,
          operator: "or",
        } as SDBOutputActionView,
      ]);

      sprootDB.getSensorConditionsAsync.resolves([]);
      sprootDB.getOutputConditionsAsync.resolves([]);
      sprootDB.getTimeConditionsAsync.resolves([
        {
          id: 1,
          automationId: 1,
          groupType: "allOf",
          startTime: null,
          endTime: null,
        } as SDBTimeCondition,
      ]);
      sprootDB.getWeekdayConditionsAsync.resolves([]);

      await automationManager.loadAsync(1);
      let result = await automationManager.evaluateAsync(sensorListMock, outputListMock, 60, now);
      assert.equal(result?.names.length, 1);
      assert.equal(result?.names[0], "test");
      assert.equal(result?.value, 75);

      //New value, same time, not runnable
      sprootDB.getAutomationsForOutputAsync.resolves([
        {
          automationId: 1,
          actionId: "1",
          name: "test",
          outputId: "1",
          value: 25,
          operator: "or",
        } as SDBOutputActionView,
      ]);
      await automationManager.loadAsync(1);
      result = await automationManager.evaluateAsync(sensorListMock, outputListMock, 60, now);
      assert.equal(result?.names.length, 1);
      assert.equal(result?.names[0], "test");
      assert.equal(result?.value, 75);

      //Add some time (longer automationInterval), not runnable
      result = await automationManager.evaluateAsync(
        sensorListMock,
        outputListMock,
        61,
        new Date(now.getTime() + 60000),
      );
      assert.equal(result?.names.length, 1);
      assert.equal(result?.names[0], "test");
      assert.equal(result?.value, 75);

      //Add same time, this should make the automation runnable again
      result = await automationManager.evaluateAsync(
        sensorListMock,
        outputListMock,
        60,
        new Date(now.getTime() + 60000),
      );
      assert.equal(result?.names.length, 1);
      assert.equal(result?.names[0], "test");
      assert.equal(result?.value, 25);
    });

    it("should return a result with null (conditions not met)", async () => {
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      const automationManager = new OutputAutomationManager(sprootDB);
      const sensorListMock = sinon.createStubInstance(SensorList);
      const outputListMock = sinon.createStubInstance(OutputList);
      const now = new Date();
      now.setHours(12);

      sprootDB.getAutomationsForOutputAsync.resolves([
        {
          automationId: 1,
          actionId: "1",
          name: "test",
          outputId: "1",
          value: 75,
          operator: "or",
        } as SDBOutputActionView,
      ]);

      sprootDB.getSensorConditionsAsync.resolves([]);
      sprootDB.getOutputConditionsAsync.resolves([]);
      sprootDB.getTimeConditionsAsync.onFirstCall().resolves([
        {
          id: 1,
          automationId: 1,
          groupType: "allOf",
          startTime: "13:00",
          endTime: null,
        } as SDBTimeCondition,
      ]);
      sprootDB.getWeekdayConditionsAsync.resolves([]);

      await automationManager.loadAsync(1);
      const result = await automationManager.evaluateAsync(sensorListMock, outputListMock, 60, now);
      assert.equal(result?.names.length, 0);
      assert.isNull(result.value);
    });

    it("should return a value (more than one automation evaluates to true (same values))", async () => {
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      const automationManager = new OutputAutomationManager(sprootDB);
      const sensorListMock = sinon.createStubInstance(SensorList);
      const outputListMock = sinon.createStubInstance(OutputList);

      sprootDB.getAutomationsForOutputAsync.resolves([
        {
          automationId: 1,
          actionId: "1",
          name: "test",
          outputId: "1",
          value: 50,
          operator: "or",
        } as SDBOutputActionView,
        {
          automationId: 2,
          actionId: "2",
          name: "test2",
          outputId: "1",
          value: 50,
          operator: "and",
        } as SDBOutputActionView,
      ]);

      sprootDB.getSensorConditionsAsync.resolves([]);
      sprootDB.getOutputConditionsAsync.resolves([]);
      sprootDB.getTimeConditionsAsync.onFirstCall().resolves([
        {
          id: 1,
          automationId: 1,
          groupType: "allOf",
          startTime: null,
          endTime: null,
        } as SDBTimeCondition,
      ]);
      sprootDB.getTimeConditionsAsync.onSecondCall().resolves([
        {
          id: 2,
          automationId: 2,
          groupType: "allOf",
          startTime: null,
          endTime: null,
        } as SDBTimeCondition,
      ]);
      sprootDB.getWeekdayConditionsAsync.resolves([]);

      await automationManager.loadAsync(1);

      const result = await automationManager.evaluateAsync(sensorListMock, outputListMock, 60);
      assert.equal(result?.names.length, 2);
      assert.equal(result?.names[0], "test");
      assert.equal(result?.names[1], "test2");
      assert.equal(result?.value, 50);
    });

    it("should return a result with null (more than one automation evaluates to true (different values))", async () => {
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      const automationManager = new OutputAutomationManager(sprootDB);
      const sensorListMock = sinon.createStubInstance(SensorList);
      const outputListMock = sinon.createStubInstance(OutputList);

      sprootDB.getAutomationsForOutputAsync.resolves([
        {
          automationId: 1,
          actionId: "1",
          name: "test",
          outputId: "1",
          value: 75,
          operator: "or",
        } as SDBOutputActionView,
        {
          automationId: 2,
          actionId: "2",
          name: "test2",
          outputId: "1",
          value: 50,
          operator: "and",
        } as SDBOutputActionView,
      ]);

      sprootDB.getSensorConditionsAsync.resolves([]);
      sprootDB.getOutputConditionsAsync.resolves([]);
      sprootDB.getTimeConditionsAsync.onFirstCall().resolves([
        {
          id: 1,
          automationId: 1,
          groupType: "allOf",
          startTime: null,
          endTime: null,
        } as SDBTimeCondition,
      ]);
      sprootDB.getTimeConditionsAsync.onSecondCall().resolves([
        {
          id: 2,
          automationId: 2,
          groupType: "allOf",
          startTime: null,
          endTime: null,
        } as SDBTimeCondition,
      ]);
      sprootDB.getWeekdayConditionsAsync.resolves([]);

      await automationManager.loadAsync(1);

      const result = await automationManager.evaluateAsync(sensorListMock, outputListMock, 60);
      assert.equal(result?.names.length, 2);
      assert.equal(result?.names[0], "test");
      assert.equal(result?.names[1], "test2");
      assert.isNull(result.value);
    });
  });

  describe("loadAsync", () => {
    it("should load all automations from the database", async () => {
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      const automationManager = new OutputAutomationManager(sprootDB);

      sprootDB.getAutomationsForOutputAsync.resolves([
        {
          automationId: 1,
          actionId: "1",
          name: "test",
          outputId: "1",
          value: 75,
          operator: "or",
        } as SDBOutputActionView,
        {
          automationId: 2,
          actionId: "2",
          name: "test2",
          outputId: "1",
          value: 50,
          operator: "and",
        } as SDBOutputActionView,
      ]);

      // Sensor conditions
      sprootDB.getSensorConditionsAsync.onFirstCall().resolves([
        {
          id: 1,
          automationId: 1,
          groupType: "allOf",
          sensorId: 1,
          readingType: ReadingType.temperature,
          operator: "equal",
          comparisonValue: 50,
        } as SDBSensorCondition,
      ]);
      sprootDB.getSensorConditionsAsync.onSecondCall().resolves([]);

      // Output conditions
      sprootDB.getOutputConditionsAsync.onFirstCall().resolves([]);
      sprootDB.getOutputConditionsAsync.onSecondCall().resolves([
        {
          id: 1,
          automationId: 2,
          groupType: "anyOf",
          outputId: 1,
          operator: "equal",
          comparisonValue: 50,
        } as SDBOutputCondition,
      ]);

      //Time conditions
      sprootDB.getTimeConditionsAsync.onFirstCall().resolves([
        {
          id: 1,
          automationId: 1,
          groupType: "allOf",
          startTime: "12:00",
          endTime: "13:00",
        } as SDBTimeCondition,
        {
          id: 2,
          automationId: 1,
          groupType: "allOf",
          startTime: "12:00",
          endTime: "13:00",
        } as SDBTimeCondition,
      ]);
      sprootDB.getTimeConditionsAsync.onSecondCall().resolves([]);

      sprootDB.getWeekdayConditionsAsync.resolves([]);

      await automationManager.loadAsync(1);

      assert.equal(Object.keys(automationManager.automations).length, 2);

      assert.equal(automationManager.automations[1]!.id, 1);
      assert.equal(automationManager.automations[1]?.name, "test");
      assert.equal(automationManager.automations[1]?.value, 75);
      assert.equal(automationManager.automations[1]?.operator, "or");
      assert.equal(automationManager.automations[1]?.conditions.allOf.length, 3);

      assert.equal(automationManager.automations[2]?.id, 2);
      assert.equal(automationManager.automations[2]?.name, "test2");
      assert.equal(automationManager.automations[2]?.value, 50);
      assert.equal(automationManager.automations[2]?.operator, "and");
      assert.equal(automationManager.automations[2]?.conditions.anyOf.length, 1);
    });
  });
});
