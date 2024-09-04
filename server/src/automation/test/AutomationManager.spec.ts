import { ReadingType } from "@sproot/sproot-common/src/sensors/ReadingType";
import { SprootDB } from "../../database/SprootDB";
import AutomationManager from "../AutomationManager";

import { assert } from "chai";
import sinon from "sinon";
import { SDBAutomation } from "@sproot/database/SDBAutomation";
import { SDBTimeAutomationCondition } from "@sproot/database/SDBTimeAutomationCondition";
import { SDBOutputAutomationCondition } from "@sproot/database/SDBOutputAutomationCondition";
import { SDBSensorAutomationCondition } from "@sproot/database/SDBSensorAutomationCondition";
import { OutputList } from "../../outputs/list/OutputList";
import { SensorList } from "../../sensors/list/SensorList";

describe("AutomationManager.ts tests", () => {

  describe("evaluate", () => {
    it("should return the automation's value (conditions met)", async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      const automationManager = new AutomationManager(sprootDB);
      const sensorListMock = sinon.createStubInstance(SensorList);
      const outputListMock = sinon.createStubInstance(OutputList);
      
      sprootDB.addAutomationAsync.resolves(1);
      await automationManager.addAutomationAsync("test", 1, 75, "or");
      sprootDB.addTimeAutomationConditionAsync.resolves(1);
      await automationManager.addTimeConditionAsync(1, "allOf", null, null);

      assert.equal(automationManager.evaluate(sensorListMock, outputListMock), 75);
    });

    it("should return null (conditions not met)", async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      const automationManager = new AutomationManager(sprootDB);
      const sensorListMock = sinon.createStubInstance(SensorList);
      const outputListMock = sinon.createStubInstance(OutputList);
      const now = new Date();
      now.setHours(12);
      
      sprootDB.addAutomationAsync.resolves(1);
      await automationManager.addAutomationAsync("test", 1, 75, "or");
      sprootDB.addTimeAutomationConditionAsync.resolves(1);
      await automationManager.addTimeConditionAsync(1, "allOf", "13:00", null);

      assert.isNull(automationManager.evaluate(sensorListMock, outputListMock, now));
    })

    it("should return null (more than one automation evaluates to true)", async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      const automationManager = new AutomationManager(sprootDB);
      const sensorListMock = sinon.createStubInstance(SensorList);
      const outputListMock = sinon.createStubInstance(OutputList);
      
      sprootDB.addAutomationAsync.resolves(1);
      await automationManager.addAutomationAsync("test", 1, 75, "or");
      sprootDB.addTimeAutomationConditionAsync.resolves(1);
      await automationManager.addTimeConditionAsync(1, "allOf", null, null);

      sprootDB.addAutomationAsync.resolves(2);
      await automationManager.addAutomationAsync("test2", 1, 50, "or");
      sprootDB.addTimeAutomationConditionAsync.resolves(2);
      await automationManager.addTimeConditionAsync(2, "allOf", null, null);

      assert.isNull(automationManager.evaluate(sensorListMock, outputListMock));
    });
  });

  describe("addAutomationAsync", () => {
    it("should add an automation to the manager", async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      const automationManager = new AutomationManager(sprootDB);

      sprootDB.addAutomationAsync.resolves(1);
      const result = await automationManager.addAutomationAsync("test", 1, 75, "or");
      
      assert.equal(result.id, 1);
      assert.equal(result.name, "test");
      assert.equal(result.value, 75);
      assert.equal(result.operator, "or");
    });
  });

  describe("deleteAutomationAsync", () => {
    it("should delete an automation from the manager", async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      const automationManager = new AutomationManager(sprootDB);
      
      sprootDB.addAutomationAsync.resolves(1);
      sprootDB.deleteAutomationAsync.resolves();
      await automationManager.addAutomationAsync("test", 1, 75, "or");
      await automationManager.deleteAutomationAsync(1);

      assert.isEmpty(Object.values(automationManager.automations));
    });
  });

  describe("updateAutomationAsync", () => {
    it('should update an automation in the manager', async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      const automationManager = new AutomationManager(sprootDB);

      sprootDB.addAutomationAsync.resolves(1);
      sprootDB.updateAutomationAsync.resolves();
      await automationManager.addAutomationAsync("test", 1, 75, "or");
      await automationManager.updateAutomationAsync({ id: 1, name: "test2", value: 50, operator: "and" });

      const automation = automationManager.automations[1];
      assert.equal(automation?.name, "test2");
      assert.equal(automation?.value, 50);
      assert.equal(automation?.operator, "and");
    });

    it("should not update an automation that does not exist", async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      const automationManager = new AutomationManager(sprootDB);

      sprootDB.updateAutomationAsync.resolves();
      await automationManager.updateAutomationAsync({ id: 1, name: "test2", value: 50, operator: "and" });

      assert.isUndefined(automationManager.automations[1]);
    });
  });

  describe("addSensorConditionAsync", () => {
    it('should add a sensor condition to an automation', async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      const automationManager = new AutomationManager(sprootDB);

      sprootDB.addAutomationAsync.resolves(1);
      await automationManager.addAutomationAsync("test", 1, 75, "or");
      sprootDB.addSensorAutomationConditionAsync.resolves();
      await automationManager.addSensorConditionAsync(1, "allOf", "equal", 50, 1, ReadingType.temperature);

      const automation = automationManager.automations[1];
      assert.equal(automation?.conditions.groupedConditions.sensor.allOf.length, 1);
    });

    it('should not add a sensor condition to an automation that does not exist', async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      const automationManager = new AutomationManager(sprootDB);

      sprootDB.addSensorAutomationConditionAsync.resolves();
      await automationManager.addSensorConditionAsync(1, "allOf", "equal", 50, 1, ReadingType.temperature);

      const automation = automationManager.automations[1];
      assert.isUndefined(automation);
    });
  });

  describe("addOutputConditionAsync", () => {
    it('should add an output condition to an automation', async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      const automationManager = new AutomationManager(sprootDB);

      sprootDB.addAutomationAsync.resolves(1);
      await automationManager.addAutomationAsync("test", 1, 75, "or");
      sprootDB.addOutputAutomationConditionAsync.resolves();
      await automationManager.addOutputConditionAsync(1, "allOf", "equal", 50, 1);

      const automation = automationManager.automations[1];
      assert.equal(automation?.conditions.groupedConditions.output.allOf.length, 1);
    });

    it('should not add an output condition to an automation that does not exist', async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      const automationManager = new AutomationManager(sprootDB);

      sprootDB.addOutputAutomationConditionAsync.resolves();
      await automationManager.addOutputConditionAsync(1, "allOf", "equal", 50, 1);

      const automation = automationManager.automations[1];
      assert.isUndefined(automation);
    });
  });

  describe("addTimeConditionAsync", () => {
    it('should add a time condition to an automation', async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      const automationManager = new AutomationManager(sprootDB);

      sprootDB.addAutomationAsync.resolves(1);
      await automationManager.addAutomationAsync("test", 1, 75, "or");
      sprootDB.addTimeAutomationConditionAsync.resolves();
      await automationManager.addTimeConditionAsync(1, "allOf", "12:00", "13:00");

      const automation = automationManager.automations[1];
      assert.equal(automation?.conditions.groupedConditions.time.allOf.length, 1);
    });

    it('should not add a time condition to an automation that does not exist', async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      const automationManager = new AutomationManager(sprootDB);

      sprootDB.addTimeAutomationConditionAsync.resolves();
      await automationManager.addTimeConditionAsync(1, "allOf", "12:00", "13:00");

      const automation = automationManager.automations[1];
      assert.isUndefined(automation);
    });
  });

  describe("updateConditionAsync", () => {
    it('should update a condition in an automation', async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      const automationManager = new AutomationManager(sprootDB);

      sprootDB.addAutomationAsync.resolves(1);
      await automationManager.addAutomationAsync("test", 1, 75, "or");
      sprootDB.addTimeAutomationConditionAsync.resolves(1);
      const condition = await automationManager.addTimeConditionAsync(1, "allOf", "12:00", "13:00");

      condition!.groupType = "anyOf";
      condition!.startTime = "13:00";
      condition!.endTime = "14:00";
      sprootDB.updateTimeAutomationConditionAsync.resolves();
      await automationManager.updateConditionAsync(1, condition!);

      assert.equal(automationManager.automations[1]?.conditions.groupedConditions.time.anyOf[0]!.groupType, "anyOf");
      assert.equal(automationManager.automations[1]?.conditions.groupedConditions.time.anyOf[0]!.startTime, "13:00");
      assert.equal(automationManager.automations[1]?.conditions.groupedConditions.time.anyOf[0]!.endTime, "14:00");
    });

    it('should not update a condition in an automation that does not exist', async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      const automationManager = new AutomationManager(sprootDB);

      sprootDB.addAutomationAsync.resolves(1);
      await automationManager.addAutomationAsync("test", 1, 75, "or");
      sprootDB.addTimeAutomationConditionAsync.resolves(1);
      const condition = await automationManager.addTimeConditionAsync(1, "allOf", "12:00", "13:00");

      sprootDB.updateTimeAutomationConditionAsync.resolves();
      await automationManager.updateConditionAsync(2, condition!);

      assert.isUndefined(automationManager.automations[2])
    });
  });

  describe("deleteSensorConditionAsync", () => {
    it('should delete a sensor condition from an automation', async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      const automationManager = new AutomationManager(sprootDB);

      sprootDB.addAutomationAsync.resolves(1);
      await automationManager.addAutomationAsync("test", 1, 75, "or");
      sprootDB.addSensorAutomationConditionAsync.resolves(1);
      await automationManager.addSensorConditionAsync(1, "allOf", "equal", 50, 1, ReadingType.temperature);

      sprootDB.deleteSensorAutomationConditionAsync.resolves();
      await automationManager.deleteSensorConditionAsync(1, 1);

      assert.isEmpty(automationManager.automations[1]?.conditions.groupedConditions.sensor.allOf);
    });

    it('should not delete a sensor condition from an automation that does not exist', async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      const automationManager = new AutomationManager(sprootDB);

      sprootDB.deleteSensorAutomationConditionAsync.resolves();
      await automationManager.deleteSensorConditionAsync(1, 1);

      assert.isUndefined(automationManager.automations[1]);
    });
  });

  describe("deleteOutputConditionAsync", () => {
    it('should delete an output condition from an automation', async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      const automationManager = new AutomationManager(sprootDB);

      sprootDB.addAutomationAsync.resolves(1);
      await automationManager.addAutomationAsync("test", 1, 75, "or");
      sprootDB.addOutputAutomationConditionAsync.resolves(1);
      await automationManager.addOutputConditionAsync(1, "allOf", "equal", 50, 1);

      sprootDB.deleteOutputAutomationConditionAsync.resolves();
      await automationManager.deleteOutputConditionAsync(1, 1);

      assert.isEmpty(automationManager.automations[1]?.conditions.groupedConditions.output.allOf);
    });

    it('should not delete an output condition from an automation that does not exist', async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      const automationManager = new AutomationManager(sprootDB);

      sprootDB.deleteOutputAutomationConditionAsync.resolves();
      await automationManager.deleteOutputConditionAsync(1, 1);

      assert.isUndefined(automationManager.automations[1]);
    });
  });

  describe("deleteTimeConditionAsync", () => {
    it('should delete a time condition from an automation', async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      const automationManager = new AutomationManager(sprootDB);

      sprootDB.addAutomationAsync.resolves(1);
      await automationManager.addAutomationAsync("test", 1, 75, "or");
      sprootDB.addTimeAutomationConditionAsync.resolves(1);
      await automationManager.addTimeConditionAsync(1, "allOf", "12:00", "13:00");

      sprootDB.deleteTimeAutomationConditionAsync.resolves();
      await automationManager.deleteTimeConditionAsync(1, 1);

      assert.isEmpty(automationManager.automations[1]?.conditions.groupedConditions.time.allOf);
    });

    it('should not delete a time condition from an automation that does not exist', async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      const automationManager = new AutomationManager(sprootDB);

      sprootDB.deleteTimeAutomationConditionAsync.resolves();
      await automationManager.deleteTimeConditionAsync(1, 1);

      assert.isUndefined(automationManager.automations[1]);
    });
  });

  describe("loadAsync", () => {
    it('should load all automations from the database', async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      const automationManager = new AutomationManager(sprootDB);

      sprootDB.getAutomationsAsync.resolves([
        { id: 1, name: "test", outputId: 1, value: 75, operator: "or" } as SDBAutomation,
        { id: 2, name: "test2", outputId: 1, value: 50, operator: "and" } as SDBAutomation
      ]);

      // Sensor conditions
      sprootDB.getSensorAutomationConditionsAsync.onFirstCall().resolves([
        { id: 1, automationId: 1, groupType: "allOf", sensorId: 1, readingType: ReadingType.temperature, operator: "equal", comparisonValue: 50 } as SDBSensorAutomationCondition
      ]);
      sprootDB.getSensorAutomationConditionsAsync.onSecondCall().resolves([]);

      // Output conditions
      sprootDB.getOutputAutomationConditionsAsync.onFirstCall().resolves([]);
      sprootDB.getOutputAutomationConditionsAsync.onSecondCall().resolves([
        { id: 1, automationId: 2, groupType: "anyOf", outputId: 1, operator: "equal", comparisonValue: 50 } as SDBOutputAutomationCondition
      ]);

      //Time conditions
      sprootDB.getTimeAutomationConditionsAsync.onFirstCall().resolves([
        { id: 1, automationId: 1, groupType: "allOf", startTime: "12:00", endTime: "13:00" } as SDBTimeAutomationCondition,
        { id: 2, automationId: 1, groupType: "allOf", startTime: "12:00", endTime: "13:00" } as SDBTimeAutomationCondition
      ]);
      sprootDB.getTimeAutomationConditionsAsync.onSecondCall().resolves([]);

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
})