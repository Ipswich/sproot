import { SprootDB } from "../../database/SprootDB";
import AutomationManager from "../AutomationManager";
import { Automation } from "../Automation";
import { SensorList } from "../../sensors/list/SensorList";
import { OutputList } from "../../outputs/list/OutputList";

import { assert } from "chai";
import sinon from "sinon";
import { SDBAutomation } from "@sproot/database/SDBAutomation";
import { SDBSensorAutomationCondition } from "@sproot/database/SDBSensorAutomationCondition";
import { SDBOutputAutomationCondition } from "@sproot/database/SDBOutputAutomationCondition";
import IAutomation from "@sproot/automation/IAutomation";

describe("AutomationManager.ts tests", () => {
  describe("AutomationManager", () => {
    describe("addAsync", () => {
      it('should add two basic automations (and call evaluate on them)', async () => {
        const sprootDB = sinon.createStubInstance(SprootDB);
        const sensorListStub = sinon.createStubInstance(SensorList);
        const outputListStub = sinon.createStubInstance(OutputList);

        const automationManager = new AutomationManager(sprootDB);
        const automationSpy = sinon.spy(Automation.prototype, "evaluate");
        const sensorAutomation = {
          id: 1,
          name: "sensorAutomation",
          value: 50,
          operator: "and",
          startTime: null,
          endTime: null
        } as SDBAutomation;
        const outputAutomation = {
          id: 2,
          name: "outputAutomation",
          value: 75,
          operator: "and",
          startTime: null,
          endTime: null
      } as SDBAutomation;

        sprootDB.addAutomationAsync.resolves(1);
        await automationManager.addAutomationAsync(1, sensorAutomation);
        sprootDB.addAutomationAsync.resolves(2);
        await automationManager.addAutomationAsync(1, outputAutomation);
        // added two automations, verify
        assert.equal(Object.keys(automationManager.automations).length, 2);
        assert.equal(sprootDB.addAutomationAsync.callCount, 2);

        // Verify that the rules object has been created
        assert.equal(Object.keys(automationManager.automations[1]?.rules!).length, 3);
        assert.equal(Object.keys(automationManager.automations[2]?.rules!).length, 3);
        
        // call evaluate on both automations
        automationManager.evaluate(sensorListStub, outputListStub, new Date());
        sinon.assert.calledTwice(automationSpy);
      })
    });

    describe("deleteAsync", () => {
      it('should add one automation and then remove it.', async () => {
        const sprootDB = sinon.createStubInstance(SprootDB);
        const automationManager = new AutomationManager(sprootDB);

        const outputAutomation = {
          id: 1,
          name: "sensorAutomation",
          value: 50,
          operator: "or",
          startTime: null,
          endTime: null
        } as SDBAutomation;

        sprootDB.addAutomationAsync.resolves(1);
        await automationManager.addAutomationAsync(1, outputAutomation);

        assert.equal(Object.keys(automationManager.automations).length, 1);
        assert.equal(sprootDB.addAutomationAsync.callCount, 1);

        await automationManager.deleteAutomationAsync(1);
        assert.equal(Object.keys(automationManager.automations).length, 0);
        assert.equal(sprootDB.deleteAutomationAsync.callCount, 1);
      })
    });

    describe("updateAsync", () => {
      it('should add one automation and then update it.', async () => {
        const sprootDB = sinon.createStubInstance(SprootDB);
        const automationManager = new AutomationManager(sprootDB);

        const sensorAutomation = {
          id: 1,
          name: "sensorAutomation",
          value: 50,
          operator: "or",
          startTime: null,
          endTime: null
        } as SDBAutomation;

        sprootDB.addAutomationAsync.resolves(1);
        sprootDB.updateSensorAutomationConditionAsync.resolves();
        sprootDB.updateOutputAutomationConditionAsync.resolves();

        sprootDB.addSensorAutomationConditionAsync.resolves(2);
        sprootDB.addOutputAutomationConditionAsync.resolves(2);
        await automationManager.addAutomationAsync(1, sensorAutomation);

        assert.equal(Object.keys(automationManager.automations).length, 1);
        assert.equal(automationManager.automations[1]!.name, "sensorAutomation");
        assert.equal(automationManager.automations[1]!.value, 50);
        assert.equal(automationManager.automations[1]!.operator, "or");

        const updatedAutomation = {
          id: 1,
          name: "sensorAutomation, yo",
          value: 55,
          operator: "and",
          startTime: null,
          endTime: null
        } as IAutomation;

        await automationManager.updateAutomationAsync(1, updatedAutomation);
        assert.equal(Object.keys(automationManager.automations).length, 1);
        assert.equal(sprootDB.updateAutomationAsync.callCount, 1);

        assert.equal(automationManager.automations[1]!.name, "sensorAutomation, yo");
        assert.equal(automationManager.automations[1]!.value, 55);
        assert.equal(automationManager.automations[1]!.operator, "and");
      });
    });

    describe("loadAsync", () => {
      it('should load two automations, assigning conditions to their respective type', async () => {
        const sprootDB = sinon.createStubInstance(SprootDB);
        const automationManager = new AutomationManager(sprootDB);

        sprootDB.getAutomationsAsync.resolves([
          {
            id: 1,
            name: "sensorAutomation",
            outputId: 1,
            value: 50,
            operator: "and",
            startTime: null,
            endTime: null,
          } as SDBAutomation,
          {
            id: 2,
            name: "outputAutomation",
            outputId: 1,
            value: 75,
            operator: "or",
            startTime: null,
            endTime: null,
          } as SDBAutomation
        ]);

        sprootDB.getSensorAutomationConditionsAsync.onFirstCall().resolves([
          {
            id: 1,
            automationId: 1,
            type: "allOf",
            sensorId: 1,
            readingType: "temperature",
            operator: "equal",
            comparisonValue: 50
          } as SDBSensorAutomationCondition,
          {
            id: 2,
            automationId: 1,
            type: "anyOf",
            sensorId: 1,
            readingType: "temperature",
            operator: "equal",
            comparisonValue: 50
          } as SDBSensorAutomationCondition,
          {
            id: 3,
            automationId: 1,
            type: "oneOf",
            sensorId: 1,
            readingType: "temperature",
            operator: "equal",
            comparisonValue: 50
          } as SDBSensorAutomationCondition
        ]);
        sprootDB.getSensorAutomationConditionsAsync.onSecondCall().resolves([]);

        sprootDB.getOutputAutomationConditionsAsync.onFirstCall().resolves([]);
        sprootDB.getOutputAutomationConditionsAsync.onSecondCall().resolves([
          {
            id: 1,
            automationId: 2,
            type: "allOf",
            outputId: 1,
            operator: "equal",
            comparisonValue: 50
          } as SDBOutputAutomationCondition,
          {
            id: 2,
            automationId: 2,
            type: "anyOf",
            outputId: 1,
            operator: "equal",
            comparisonValue: 50
          } as SDBOutputAutomationCondition,
          {
            id: 3,
            automationId: 2,
            type: "oneOf",
            outputId: 1,
            operator: "equal",
            comparisonValue: 50
          } as SDBOutputAutomationCondition
        ]);

        await automationManager.loadAsync(1);

        assert.equal(Object.keys(automationManager.automations).length, 2);
        assert.equal(Object.keys(automationManager.automations[1]!.rules.allOf).length, 1);
        assert.equal(Object.keys(automationManager.automations[1]!.rules.anyOf).length, 1);
        assert.equal(Object.keys(automationManager.automations[1]!.rules.oneOf).length, 1);
        assert.equal(Object.keys(automationManager.automations[2]!.rules.allOf).length, 1);
        assert.equal(Object.keys(automationManager.automations[2]!.rules.anyOf).length, 1);
        assert.equal(Object.keys(automationManager.automations[2]!.rules.oneOf).length, 1);
        assert.equal(sprootDB.getAutomationsAsync.callCount, 1);
        assert.equal(sprootDB.getSensorAutomationConditionsAsync.callCount, 2);
        assert.equal(sprootDB.getOutputAutomationConditionsAsync.callCount, 2);
      });
    });
  })
})