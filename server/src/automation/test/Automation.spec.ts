import { Automation } from "../Automation";
import { AutomationEvent } from "../AutomationEvent";
import { IAutomationEventPayload } from "@sproot/automation/IAutomationEventPayload";
import { assert } from "chai";
import sinon from "sinon";
import { SensorList } from "../../sensors/list/SensorList";
import { OutputList } from "../../outputs/list/OutputList";
import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";

describe("Automation.ts tests", () => {
  describe("evaluate", () => {
    it("should return true when conditions are met", async () => {
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      const sensorListMock = sinon.createStubInstance(SensorList);
      const outputListMock = sinon.createStubInstance(OutputList);

      // No conditions should return false
      sprootDB.getSensorConditionsAsync.resolves([]);
      sprootDB.getOutputConditionsAsync.resolves([]);
      sprootDB.getTimeConditionsAsync.resolves([]);
      sprootDB.getWeekdayConditionsAsync.resolves([]);
      sprootDB.getMonthConditionsAsync.resolves([]);
      sprootDB.getDateRangeConditionsAsync.resolves([]);

      const automation = await Automation.createInstanceAsync(1, "test", "or", true, sprootDB);
      const result1 = await automation.evaluate(sensorListMock, outputListMock, new Date());
      assert.isFalse(result1.result);

      // Add a condition (empty time range matches always)
      sprootDB.getSensorConditionsAsync.resolves([]);
      sprootDB.getOutputConditionsAsync.resolves([]);
      sprootDB.getTimeConditionsAsync.resolves([
        {
          id: 1,
          automationId: 1,
          groupType: "allOf",
          startTime: null,
          endTime: null,
        },
      ]);
      sprootDB.getWeekdayConditionsAsync.resolves([]);
      sprootDB.getMonthConditionsAsync.resolves([]);
      sprootDB.getDateRangeConditionsAsync.resolves([]);

      // Reload conditions from DB
      await automation.conditions.loadAsync();

      const result2 = await automation.evaluate(sensorListMock, outputListMock, new Date());
      assert.isTrue(result2.result);
      assert.equal(result2.conditions.allOf.length, 1);
    });

    it("should return false when conditions are not met", async () => {
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      const sensorListMock = sinon.createStubInstance(SensorList);
      const outputListMock = sinon.createStubInstance(OutputList);
      const now = new Date();
      now.setHours(12);

      // Initial load with empty conditions
      sprootDB.getSensorConditionsAsync.resolves([]);
      sprootDB.getOutputConditionsAsync.resolves([]);
      sprootDB.getTimeConditionsAsync.resolves([]);
      sprootDB.getWeekdayConditionsAsync.resolves([]);
      sprootDB.getMonthConditionsAsync.resolves([]);
      sprootDB.getDateRangeConditionsAsync.resolves([]);

      const automation = await Automation.createInstanceAsync(1, "test", "or", true, sprootDB);

      // Add conditions that don't match (time is 12:00, condition requires >= 13:00)
      sprootDB.getSensorConditionsAsync.resolves([]);
      sprootDB.getOutputConditionsAsync.resolves([]);
      sprootDB.getTimeConditionsAsync.resolves([
        {
          id: 1,
          automationId: 1,
          groupType: "allOf",
          startTime: "13:00",
          endTime: null,
        },
        {
          id: 2,
          automationId: 1,
          groupType: "allOf",
          startTime: "12:00",
          endTime: null,
        },
      ]);
      sprootDB.getWeekdayConditionsAsync.resolves([]);
      sprootDB.getMonthConditionsAsync.resolves([]);
      sprootDB.getDateRangeConditionsAsync.resolves([]);

      // Reload conditions from DB
      await automation.conditions.loadAsync();

      const result = await automation.evaluate(sensorListMock, outputListMock, now);
      assert.isFalse(result.result);
    });
  });

  describe("enabled flag", () => {
    it("should return false for disabled automations", async () => {
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      const sensorListMock = sinon.createStubInstance(SensorList);
      const outputListMock = sinon.createStubInstance(OutputList);

      // Initial load with empty conditions
      sprootDB.getSensorConditionsAsync.resolves([]);
      sprootDB.getOutputConditionsAsync.resolves([]);
      sprootDB.getTimeConditionsAsync.resolves([]);
      sprootDB.getWeekdayConditionsAsync.resolves([]);
      sprootDB.getMonthConditionsAsync.resolves([]);
      sprootDB.getDateRangeConditionsAsync.resolves([]);

      const automationEnabled = await Automation.createInstanceAsync(
        1,
        "enabledAutomation",
        "or",
        true,
        sprootDB,
      );
      const automationDisabled = await Automation.createInstanceAsync(
        2,
        "disabledAutomation",
        "or",
        false,
        sprootDB,
      );

      // No conditions, both should return false
      let result = await automationEnabled.evaluate(sensorListMock, outputListMock, new Date());
      assert.isFalse(result.result);
      result = await automationDisabled.evaluate(sensorListMock, outputListMock, new Date());
      assert.isFalse(result.result);

      // Add a condition to the enabled automation
      sprootDB.getSensorConditionsAsync.resolves([]);
      sprootDB.getOutputConditionsAsync.resolves([]);
      sprootDB.getTimeConditionsAsync.resolves([
        {
          id: 1,
          automationId: 1,
          groupType: "anyOf",
          startTime: null,
          endTime: null,
        },
      ]);
      sprootDB.getWeekdayConditionsAsync.resolves([]);
      sprootDB.getMonthConditionsAsync.resolves([]);
      sprootDB.getDateRangeConditionsAsync.resolves([]);

      // Reload conditions from DB
      await automationEnabled.conditions.loadAsync();
      await automationDisabled.conditions.loadAsync();

      result = await automationEnabled.evaluate(sensorListMock, outputListMock, new Date());
      assert.isTrue(result.result);

      result = await automationDisabled.evaluate(sensorListMock, outputListMock, new Date());
      assert.isFalse(result.result);
    });
  });

  describe("AutomationEvent", () => {
    it("should create event with triggered automations", () => {
      const payload: IAutomationEventPayload = {
        automationId: 1,
        automationName: "testAutomation",
        operator: "or",
        conditions: {
          allOf: [
            {
              condition: {
                kind: "time",
                id: 1,
                startTime: "10:00",
                endTime: "12:00",
              },
              result: true,
            },
          ],
          anyOf: [],
          oneOf: [],
        },
      };

      const triggeredAutomations = new Map<number, IAutomationEventPayload>();
      triggeredAutomations.set(1, payload);

      const event = new AutomationEvent(triggeredAutomations, new Date());
      assert.equal(event.triggeredAutomations.size, 1);
      assert.isTrue(event.triggeredAutomations.has(1));
    });
  });
});
