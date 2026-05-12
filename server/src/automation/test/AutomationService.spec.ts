import { AutomationService } from "../AutomationService";
import { assert } from "chai";
import sinon from "sinon";
import { SensorList } from "../../sensors/list/SensorList";
import { OutputList } from "../../outputs/list/OutputList";
import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import winston from "winston";
import { MemoryEventBus } from "../../eventbus/MemoryEventBus";
import { Events } from "../../eventbus/events/Events";
import { AutomationsTriggeredEvent } from "../../eventbus/events/automations/AutomationsTriggeredEvent";

describe("AutomationService", () => {
  let mockLogger: winston.Logger;
  let eventBus: MemoryEventBus;

  const captureNextTriggeredEvent = async (
    action: () => Promise<void>,
  ): Promise<AutomationsTriggeredEvent> => {
    const eventPromise = new Promise<AutomationsTriggeredEvent>((resolve) => {
      const unsubscribe = eventBus.subscribe(Events.AUTOMATIONS_TRIGGERED_EVENT, (event) => {
        unsubscribe();
        resolve(event);
      });
    });

    await action();
    return eventPromise;
  };

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

  beforeEach(() => {
    eventBus = new MemoryEventBus(mockLogger);
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

      const service = await AutomationService.createInstanceAsync(sprootDB, eventBus, mockLogger);

      const sensorListMock = sinon.createStubInstance(SensorList);
      const outputListMock = sinon.createStubInstance(OutputList);

      const event = await captureNextTriggeredEvent(() =>
        service.evaluateAllAutomationsAsync(sensorListMock, outputListMock, new Date()),
      );

      assert.equal(event.payload.size, 1);
      assert.isTrue(event.payload.has(1));

      const payload = event.payload.get(1);
      assert.equal(payload!.automationId, 1);
      assert.equal(payload!.automationName, "Time Alert");
      assert.equal(payload!.operator, "or");
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

      const service = await AutomationService.createInstanceAsync(sprootDB, eventBus, mockLogger);

      const sensorListMock = sinon.createStubInstance(SensorList);
      const outputListMock = sinon.createStubInstance(OutputList);
      const now = new Date("2024-01-15T10:30:00Z");

      const event = await captureNextTriggeredEvent(() =>
        service.evaluateAllAutomationsAsync(sensorListMock, outputListMock, now),
      );

      assert.equal(event.occurredAt.getTime(), now.getTime());
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

      const service = await AutomationService.createInstanceAsync(sprootDB, eventBus, mockLogger);

      const sensorListMock = sinon.createStubInstance(SensorList);
      const outputListMock = sinon.createStubInstance(OutputList);
      const now = new Date();

      const event = await captureNextTriggeredEvent(() =>
        service.evaluateAllAutomationsAsync(sensorListMock, outputListMock, now),
      );

      assert.equal(event.payload.size, 2);
      assert.isTrue(event.payload.has(1));
      assert.isFalse(event.payload.has(2));
      assert.isTrue(event.payload.has(3));
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

      const service = await AutomationService.createInstanceAsync(sprootDB, eventBus, mockLogger);

      const sensorListMock = sinon.createStubInstance(SensorList);
      const outputListMock = sinon.createStubInstance(OutputList);

      const event = await captureNextTriggeredEvent(() =>
        service.evaluateAllAutomationsAsync(sensorListMock, outputListMock, new Date()),
      );

      assert.isEmpty(event.payload);
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

      const service = await AutomationService.createInstanceAsync(sprootDB, eventBus, mockLogger);

      const sensorListMock = sinon.createStubInstance(SensorList);
      const outputListMock = sinon.createStubInstance(OutputList);
      const now = new Date();

      const event = await captureNextTriggeredEvent(() =>
        service.evaluateAllAutomationsAsync(sensorListMock, outputListMock, now),
      );

      // The automation has no conditions, so it should not trigger
      assert.isEmpty(event.payload);
    });

    it("should emit (empty)event when handling empty automation list", async () => {
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getAutomationsAsync.resolves([]);

      const service = await AutomationService.createInstanceAsync(sprootDB, eventBus, mockLogger);

      const sensorListMock = sinon.createStubInstance(SensorList);
      const outputListMock = sinon.createStubInstance(OutputList);
      const now = new Date();

      const event = await captureNextTriggeredEvent(() =>
        service.evaluateAllAutomationsAsync(sensorListMock, outputListMock, now),
      );

      assert.isEmpty(event.payload);
    });
  });
});
