import { SprootDB } from "../../database/SprootDB";
import AutomationManager from "../AutomationManager";
import { Automation, AutomationRules } from "../Automation";
import { SensorList } from "../../sensors/list/SensorList";
import { OutputList } from "../../outputs/list/OutputList";
import { SensorCondition } from "../conditions/SensorCondition";
import { ReadingType } from "@sproot/sproot-common/src/sensors/ReadingType";

import { assert } from "chai";
import sinon from "sinon";
import { OutputCondition } from "../conditions/OutputCondition";
import { SDBAutomation } from "@sproot/database/SDBAutomation";
import { SDBSensorAutomationCondition } from "@sproot/database/SDBSensorAutomationCondition";
import { SDBOutputAutomationCondition } from "@sproot/database/SDBOutputAutomationCondition";
import { ICondition } from "@sproot/automation/ICondition";
import IAutomation, { IAutomationRules } from "@sproot/automation/IAutomation";

describe("AutomationManager.ts tests", () => {
  describe("AutomationManager", () => {
    describe("addAsync", () => {
      it('should add two basic automations (and call evaluate on them)', async () => {
        const sprootDB = sinon.createStubInstance(SprootDB);
        const sensorListStub = sinon.createStubInstance(SensorList);
        const outputListStub = sinon.createStubInstance(OutputList);

        const automationManager = new AutomationManager(sprootDB);
        const automationSpy = sinon.spy(Automation.prototype, "evaluate");
        const sensorAutomation = new Automation(
          1,
          "sensorAutomation",
          50,
          new AutomationRules("and", [], [], []),
          null,
          null
        );
        const outputAutomation = new Automation(
          2,
          "outputAutomation",
          75,
          new AutomationRules("and", [], [], []),
          null,
          null
        );

        sprootDB.addAutomationAsync.resolves(1);
        await automationManager.addAsync(1, sensorAutomation);
        sprootDB.addAutomationAsync.resolves(2);
        await automationManager.addAsync(1, outputAutomation);
        // added two automations, verify
        assert.equal(Object.keys(automationManager.automations).length, 2);
        assert.equal(sprootDB.addAutomationAsync.callCount, 2);

        // call evaluate on both automations
        automationManager.evaluate(sensorListStub, outputListStub, new Date());
        sinon.assert.calledTwice(automationSpy);
      })

      it("should add a sensor automation with a 3 conditions", async () => {
        const sprootDB = sinon.createStubInstance(SprootDB);
        const automationManager = new AutomationManager(sprootDB);

        const sensorAutomation = new Automation(
          1,
          "sensorAutomation",
          50,
          new AutomationRules(
            "or",
            [new SensorCondition(1, 1, ReadingType.temperature, "equal", 50)],
            [new SensorCondition(1, 1, ReadingType.temperature, "equal", 50)],
            [new SensorCondition(1, 1, ReadingType.temperature, "equal", 53)]
          ),
          null,
          null
        );

        sprootDB.addAutomationAsync.resolves(1);
        sprootDB.addSensorAutomationConditionAsync.onFirstCall().resolves(1);
        sprootDB.addSensorAutomationConditionAsync.onSecondCall().resolves(2);
        sprootDB.addSensorAutomationConditionAsync.onThirdCall().resolves(3);
        await automationManager.addAsync(1, sensorAutomation);

        assert.equal(Object.keys(automationManager.automations).length, 1);
        assert.equal(Object.keys(automationManager.automations[1]!.rules.allOf).length, 1);
        assert.equal(Object.keys(automationManager.automations[1]!.rules.anyOf).length, 1);
        assert.equal(Object.keys(automationManager.automations[1]!.rules.oneOf).length, 1);
        assert.equal(automationManager.automations[1]!.rules.allOf[0]!.id, 1);
        assert.equal(automationManager.automations[1]!.rules.anyOf[0]!.id, 2);
        assert.equal(automationManager.automations[1]!.rules.oneOf[0]!.id, 3);
        assert.equal(automationManager.automations[1]!.rules.oneOf[0]!.rightHandSideComparison, 53);
        assert.equal(sprootDB.addAutomationAsync.callCount, 1);
        assert.equal(3, sprootDB.addSensorAutomationConditionAsync.callCount);
      });

      it("should add an output automation with a 3 conditions", async () => {
        const sprootDB = sinon.createStubInstance(SprootDB);
        const automationManager = new AutomationManager(sprootDB);

        const outputAutomation = new Automation(
          1,
          "sensorAutomation",
          50,
          new AutomationRules(
            "or",
            [new OutputCondition(1, 1, "equal", 50)],
            [new OutputCondition(1, 1, "equal", 50)],
            [new OutputCondition(1, 1, "equal", 53)]
          ),
          null,
          null
        );

        sprootDB.addAutomationAsync.resolves(1);
        sprootDB.addOutputAutomationConditionAsync.onFirstCall().resolves(1);
        sprootDB.addOutputAutomationConditionAsync.onSecondCall().resolves(2);
        sprootDB.addOutputAutomationConditionAsync.onThirdCall().resolves(3);
        await automationManager.addAsync(1, outputAutomation);

        assert.equal(Object.keys(automationManager.automations).length, 1);
        assert.equal(Object.keys(automationManager.automations[1]!.rules.allOf).length, 1);
        assert.equal(Object.keys(automationManager.automations[1]!.rules.anyOf).length, 1);
        assert.equal(Object.keys(automationManager.automations[1]!.rules.oneOf).length, 1);
        assert.equal(automationManager.automations[1]!.rules.allOf[0]!.id, 1);
        assert.equal(automationManager.automations[1]!.rules.anyOf[0]!.id, 2);
        assert.equal(automationManager.automations[1]!.rules.oneOf[0]!.id, 3);
        assert.equal(automationManager.automations[1]!.rules.oneOf[0]!.rightHandSideComparison, 53);
        assert.equal(sprootDB.addAutomationAsync.callCount, 1);
        assert.equal(3, sprootDB.addOutputAutomationConditionAsync.callCount);
      });
    });

    describe("deleteAsync", () => {
      it('should add one automation and then remove it.', async () => {
        const sprootDB = sinon.createStubInstance(SprootDB);
        const automationManager = new AutomationManager(sprootDB);

        const outputAutomation = new Automation(
          1,
          "sensorAutomation",
          50,
          new AutomationRules(
            "or",
            [],
            [],
            []
          ),
          null,
          null
        );

        sprootDB.addAutomationAsync.resolves(1);
        await automationManager.addAsync(1, outputAutomation);

        assert.equal(Object.keys(automationManager.automations).length, 1);
        assert.equal(sprootDB.addAutomationAsync.callCount, 1);

        await automationManager.deleteAsync(1);
        assert.equal(Object.keys(automationManager.automations).length, 0);
        assert.equal(sprootDB.deleteAutomationAsync.callCount, 1);
      })
    });

    describe("updateAsync", () => {
      it('should add one automation and then update it.', async () => {
        const sprootDB = sinon.createStubInstance(SprootDB);
        const automationManager = new AutomationManager(sprootDB);

        const sensorAutomation = new Automation(
          1,
          "sensorAutomation",
          50,
          new AutomationRules(
            "or",
            [],
            [new OutputCondition(4, 1, "equal", 48)],
            [new SensorCondition(3, 1, ReadingType.temperature, "equal", 49)]
          ),
          null,
          null
        );

        sprootDB.addAutomationAsync.resolves(1);
        sprootDB.updateSensorAutomationConditionAsync.resolves();
        sprootDB.updateOutputAutomationConditionAsync.resolves();

        sprootDB.addSensorAutomationConditionAsync.resolves(2);
        sprootDB.addOutputAutomationConditionAsync.resolves(2);
        await automationManager.addAsync(1, sensorAutomation);

        assert.equal(Object.keys(automationManager.automations).length, 1);
        assert.equal(automationManager.automations[1]!.name, "sensorAutomation");
        assert.equal(automationManager.automations[1]!.value, 50);
        assert.equal(automationManager.automations[1]!.rules.operator, "or");
        assert.equal(automationManager.automations[1]!.rules.allOf.length, 0);
        assert.equal(automationManager.automations[1]!.rules.anyOf.length, 1);
        assert.equal(automationManager.automations[1]!.rules.oneOf.length, 1);

        const updatedAutomation = {
          id: 1,
          name: "sensorAutomation, yo",
          value: 55,
          rules: {
            operator: "and",
            allOf: [{ id: 1, sensorId: 1, readingType: ReadingType.temperature, operator: "equal", rightHandSideComparison: 50 } as ICondition],
            anyOf: [{ id: 1, outputId: 1, operator: "equal", rightHandSideComparison: 51 } as ICondition],
            oneOf: [
              { sensorId: 1, readingType: ReadingType.temperature, operator: "equal", rightHandSideComparison: 52 } as ICondition,
              { outputId: 1, operator: "equal", rightHandSideComparison: 53 } as ICondition
            ]
          } as IAutomationRules,
          startTime: null,
          endTime: null
        } as IAutomation;

        await automationManager.updateAsync(1, updatedAutomation);
        assert.equal(Object.keys(automationManager.automations).length, 1);
        assert.equal(sprootDB.updateAutomationAsync.callCount, 1);

        assert.equal(sprootDB.deleteSensorAutomationConditionsExceptAsync.calledWith(1, [1, 2]), true);
        assert.equal(sprootDB.deleteOutputAutomationConditionsExceptAsync.calledWith(1, [1, 2]), true);

        assert.equal(automationManager.automations[1]!.name, "sensorAutomation, yo");
        assert.equal(automationManager.automations[1]!.value, 55);
        assert.equal(automationManager.automations[1]!.rules.operator, "and");
        assert.equal(automationManager.automations[1]!.rules.allOf[0]!.rightHandSideComparison, 50);
        assert.equal(automationManager.automations[1]!.rules.anyOf[0]!.rightHandSideComparison, 51);
        assert.equal(automationManager.automations[1]!.rules.oneOf[0]!.rightHandSideComparison, 52);
        assert.equal(automationManager.automations[1]!.rules.oneOf[1]!.rightHandSideComparison, 53);
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