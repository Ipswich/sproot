import { AutomationService } from "../AutomationService";
import { AutomationEvent } from "../AutomationEvent";
import { assert } from "chai";
import sinon from "sinon";
import { SensorList } from "../../sensors/list/SensorList";
import { OutputList } from "../../outputs/list/OutputList";
import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import winston from "winston";

describe("AutomationService", () => {
  let mockLogger: winston.Logger;
  before(() => {
    sinon.stub(winston, "createLogger").callsFake(
      () =>
        ({
          info: () => {},
          error: () => {},
          debug: () => {},
          warn: () => {},
          verbose: () => {},
          startTimer: () => ({ done: () => {} }) as winston.Profiler,
        }) as unknown as winston.Logger,
    );
    mockLogger = winston.createLogger();
  });

  after(() => {
    sinon.restore();
  });

  describe("evaluateAllAutomationsAsync", () => {
    it("should emit event with enabled automation when conditions are met", async () => {
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getSensorConditionsAsync.resolves([]);
      sprootDB.getOutputConditionsAsync.resolves([]);
      sprootDB.getTimeConditionsAsync.resolves([
        {
          id: 1,
          automationId: 1,
          startTime: null,
          endTime: null,
          groupType: "anyOf",
        },
      ]);
      sprootDB.getWeekdayConditionsAsync.resolves([]);
      sprootDB.getMonthConditionsAsync.resolves([]);
      sprootDB.getDateRangeConditionsAsync.resolves([]);
      sprootDB.getAutomationsAsync.resolves([
        {
          id: 1,
          name: "Time Alert",
          operator: "or",
          enabled: true,
        },
      ]);

      const service = await AutomationService.createInstanceAsync(sprootDB, mockLogger);

      const sensorListMock = sinon.createStubInstance(SensorList);
      const outputListMock = sinon.createStubInstance(OutputList);

      const context = {
        eventEmitted: false,
        receivedEvent: null as AutomationEvent | null,
      };

      const handler = (event: AutomationEvent) => {
        context.eventEmitted = true;
        context.receivedEvent = event;
      };

      service.on("TriggeredAutomations", handler);

      await service.evaluateAllAutomationsAsync(sensorListMock, outputListMock, new Date());

      assert.isTrue(context.eventEmitted);
      assert.isNotNull(context.receivedEvent);
      const event = context.receivedEvent!;
      assert.equal(event.triggeredAutomations.size, 1);
      assert.isTrue(event.triggeredAutomations.has(1));

      const payload = event.triggeredAutomations.get(1);
      assert.equal(payload!.automationId, 1);
      assert.equal(payload!.automationName, "Time Alert");
      assert.equal(payload!.operator, "or");
      service.off("TriggeredAutomations", handler);
    });

    it("should emit event with timestamp matching the input 'now' parameter", async () => {
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getSensorConditionsAsync.resolves([]);
      sprootDB.getOutputConditionsAsync.resolves([]);
      sprootDB.getTimeConditionsAsync.resolves([
        {
          id: 1,
          automationId: 1,
          startTime: null,
          endTime: null,
          groupType: "anyOf",
        },
      ]);
      sprootDB.getWeekdayConditionsAsync.resolves([]);
      sprootDB.getMonthConditionsAsync.resolves([]);
      sprootDB.getDateRangeConditionsAsync.resolves([]);

      sprootDB.getAutomationsAsync.resolves([
        {
          id: 1,
          name: "Test Automation",
          operator: "or",
          enabled: true,
        },
      ]);

      const service = await AutomationService.createInstanceAsync(sprootDB, mockLogger);

      const sensorListMock = sinon.createStubInstance(SensorList);
      const outputListMock = sinon.createStubInstance(OutputList);
      const now = new Date("2024-01-15T10:30:00Z");

      const context = {
        receivedEvent: null as AutomationEvent | null,
      };

      const handler = (event: AutomationEvent) => {
        context.receivedEvent = event;
      };

      service.on("TriggeredAutomations", handler);

      await service.evaluateAllAutomationsAsync(sensorListMock, outputListMock, now);

      assert.isNotNull(context.receivedEvent);
      const event = context.receivedEvent!;
      assert.equal(event.timestamp.getTime(), now.getTime());
    });

    it("should emit single event with multiple automations with conditions met", async () => {
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getSensorConditionsAsync.resolves([]);
      sprootDB.getOutputConditionsAsync.resolves([]);
      sprootDB.getTimeConditionsAsync.resolves([
        {
          id: 1,
          automationId: 1,
          startTime: null,
          endTime: null,
          groupType: "anyOf",
        },
        {
          id: 1,
          automationId: 3,
          startTime: null,
          endTime: null,
          groupType: "anyOf",
        },
      ]);
      sprootDB.getWeekdayConditionsAsync.resolves([]);
      sprootDB.getMonthConditionsAsync.resolves([]);
      sprootDB.getDateRangeConditionsAsync.resolves([]);
      sprootDB.getAutomationsAsync.resolves([
        {
          id: 1,
          name: "Automation 1",
          operator: "or",
          enabled: true,
        },
        {
          id: 2,
          name: "Automation 2",
          operator: "or",
          enabled: false,
        },
        {
          id: 3,
          name: "Automation 3",
          operator: "or",
          enabled: true,
        },
      ]);

      const service = await AutomationService.createInstanceAsync(sprootDB, mockLogger);

      const sensorListMock = sinon.createStubInstance(SensorList);
      const outputListMock = sinon.createStubInstance(OutputList);
      const now = new Date();

      const context = {
        eventEmitted: false,
        receivedEvent: null as AutomationEvent | null,
      };

      const handler = (event: AutomationEvent) => {
        context.eventEmitted = true;
        context.receivedEvent = event;
      };

      service.on("TriggeredAutomations", handler);

      await service.evaluateAllAutomationsAsync(sensorListMock, outputListMock, now);

      assert.isTrue(context.eventEmitted);
      assert.isNotNull(context.receivedEvent);
      const event = context.receivedEvent!;
      assert.equal(event.triggeredAutomations.size, 2);
      assert.isTrue(event.triggeredAutomations.has(1));
      assert.isFalse(event.triggeredAutomations.has(2));
      assert.isTrue(event.triggeredAutomations.has(3));
      service.off("TriggeredAutomations", handler);
    });

    it("should emit (empty) event with disabled automation (conditions met)", async () => {
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getSensorConditionsAsync.resolves([]);
      sprootDB.getOutputConditionsAsync.resolves([]);
      sprootDB.getTimeConditionsAsync.resolves([
        {
          id: 1,
          automationId: 1,
          startTime: null,
          endTime: null,
          groupType: "anyOf",
        },
      ]);
      sprootDB.getWeekdayConditionsAsync.resolves([]);
      sprootDB.getMonthConditionsAsync.resolves([]);
      sprootDB.getDateRangeConditionsAsync.resolves([]);
      sprootDB.getAutomationsAsync.resolves([
        {
          id: 1,
          name: "Time Alert",
          operator: "or",
          enabled: false,
        },
      ]);

      const service = await AutomationService.createInstanceAsync(sprootDB, mockLogger);

      const sensorListMock = sinon.createStubInstance(SensorList);
      const outputListMock = sinon.createStubInstance(OutputList);

      const context = {
        eventEmitted: false,
        receivedEvent: null as AutomationEvent | null,
      };

      const handler = (event: AutomationEvent) => {
        context.eventEmitted = true;
        context.receivedEvent = event;
      };

      service.on("TriggeredAutomations", handler);

      await service.evaluateAllAutomationsAsync(sensorListMock, outputListMock, new Date());

      assert.isTrue(context.eventEmitted);
      assert.isEmpty(context.receivedEvent!.triggeredAutomations);

      service.off("TriggeredAutomations", handler);
    });

    it("should emit (empty) event with enabled automation when no conditions are met", async () => {
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getSensorConditionsAsync.resolves([]);
      sprootDB.getOutputConditionsAsync.resolves([]);
      sprootDB.getTimeConditionsAsync.resolves([]);
      sprootDB.getWeekdayConditionsAsync.resolves([]);
      sprootDB.getMonthConditionsAsync.resolves([]);
      sprootDB.getDateRangeConditionsAsync.resolves([]);

      sprootDB.getAutomationsAsync.resolves([
        {
          id: 1,
          name: "Test Automation",
          operator: "or",
          enabled: true,
        },
      ]);

      const service = await AutomationService.createInstanceAsync(sprootDB, mockLogger);

      const sensorListMock = sinon.createStubInstance(SensorList);
      const outputListMock = sinon.createStubInstance(OutputList);
      const now = new Date();

      const context = {
        eventEmitted: false,
        receivedEvent: null as AutomationEvent | null,
      };

      const handler = (event: AutomationEvent) => {
        context.eventEmitted = true;
        context.receivedEvent = event;
      };

      service.on("TriggeredAutomations", handler);

      await service.evaluateAllAutomationsAsync(sensorListMock, outputListMock, now);

      // The automation has no conditions, so it should not trigger
      assert.isTrue(context.eventEmitted);
      assert.isEmpty(context.receivedEvent!.triggeredAutomations);
    });

    it("should emit (empty)event when handling empty automation list", async () => {
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getAutomationsAsync.resolves([]);

      const service = await AutomationService.createInstanceAsync(sprootDB, mockLogger);

      const sensorListMock = sinon.createStubInstance(SensorList);
      const outputListMock = sinon.createStubInstance(OutputList);
      const now = new Date();

      const context = {
        eventEmitted: false,
        receivedEvent: null as AutomationEvent | null,
      };

      const handler = (event: AutomationEvent) => {
        context.eventEmitted = true;
        context.receivedEvent = event;
      };

      service.on("TriggeredAutomations", handler);

      await service.evaluateAllAutomationsAsync(sensorListMock, outputListMock, now);

      assert.isTrue(context.eventEmitted);
      assert.isEmpty(context.receivedEvent!.triggeredAutomations);
    });
  });
});
