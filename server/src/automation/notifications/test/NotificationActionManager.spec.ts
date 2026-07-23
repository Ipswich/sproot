import { NotificationActionManager } from "../NotificationActionManager";
import { NotificationAction } from "../NotificationAction";
import { assert } from "chai";
import sinon from "sinon";
import winston from "winston";
import { MemoryEventBus } from "../../../eventbus/MemoryEventBus";
import { AutomationsTriggeredEvent } from "../../../eventbus/events/automations/AutomationsTriggeredEvent";
import { NotificationActionsModifiedEvent } from "../../../eventbus/events/actions/NotificationActionsModifiedEvent";
import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";

const createStubSprootDB = () => {
  const sprootDB = new MockSprootDB() as any;
  sprootDB.automations = {
    actions: {
      notification: {
        getAllAsync: sinon.stub(),
      },
    },
  } as any;
  return sprootDB;
};

describe("NotificationActionManager.ts tests", () => {
  let mockLogger: winston.Logger;

  const publishAutomationEventAsync = async (
    eventBus: MemoryEventBus,
    triggeredAutomations: Map<number, any>,
    occurredAt = new Date(),
  ) => {
    await eventBus.publishAsync(new AutomationsTriggeredEvent(triggeredAutomations, occurredAt));
    await new Promise((resolve) => setImmediate(resolve));
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

  after(() => {
    sinon.restore();
  });

  describe("activeNotifications", () => {
    it("should return active notifications with correct structure", async () => {
      const sprootDB = createStubSprootDB();
      const eventBus = new MemoryEventBus(mockLogger);
      sprootDB.automations.actions.notification.getAllAsync.resolves([
        {
          id: 1,
          automationId: 1,
          subject: "Test Subject",
          content: "Test Content",
        },
      ]);

      using manager = await NotificationActionManager.createInstanceAsync(
        sprootDB,
        eventBus,
        mockLogger,
      );

      const triggeredAutomations = new Map<number, any>();
      triggeredAutomations.set(1, {
        automationId: 1,
        automationName: "testAutomation",
        operator: "or",
        conditions: { allOf: [], anyOf: [], oneOf: [] },
      });

      const occurredAt = new Date("2026-04-19T10:00:00Z");
      await publishAutomationEventAsync(eventBus, triggeredAutomations, occurredAt);

      const result = manager.activeNotifications;
      assert.equal(result.lastRunAt, occurredAt.getTime());
      assert.lengthOf(result.notifications, 1);
      assert.equal(result.notifications[0]!.notificationId, 1);
      assert.equal(result.notifications[0]!.subject, "Test Subject");
      assert.equal(result.notifications[0]!.content, "Test Content");
      assert.equal(result.notifications[0]!.payload.automationId, 1);
    });

    it("should return empty notifications when no automations trigger", async () => {
      const sprootDB = createStubSprootDB();
      const eventBus = new MemoryEventBus(mockLogger);
      sprootDB.automations.actions.notification.getAllAsync.resolves([
        {
          id: 1,
          automationId: 1,
          subject: "Test Subject",
          content: "Test Content",
        },
      ]);

      using manager = await NotificationActionManager.createInstanceAsync(
        sprootDB,
        eventBus,
        mockLogger,
      );

      const occurredAt = new Date("2026-04-19T10:00:00Z");
      await publishAutomationEventAsync(eventBus, new Map(), occurredAt);

      const result = manager.activeNotifications;
      assert.equal(result.lastRunAt, occurredAt.getTime());
      assert.lengthOf(result.notifications, 0);
    });

    it("should return multiple active notifications when multiple automations trigger", async () => {
      const sprootDB = createStubSprootDB();
      const eventBus = new MemoryEventBus(mockLogger);
      sprootDB.automations.actions.notification.getAllAsync.resolves([
        {
          id: 1,
          automationId: 1,
          subject: "Subject 1",
          content: "Content 1",
        },
        {
          id: 2,
          automationId: 2,
          subject: "Subject 2",
          content: "Content 2",
        },
      ]);

      using manager = await NotificationActionManager.createInstanceAsync(
        sprootDB,
        eventBus,
        mockLogger,
      );

      const triggeredAutomations = new Map<number, any>();
      triggeredAutomations.set(1, {
        automationId: 1,
        automationName: "automation1",
        operator: "or",
        conditions: { allOf: [], anyOf: [], oneOf: [] },
      });
      triggeredAutomations.set(2, {
        automationId: 2,
        automationName: "automation2",
        operator: "or",
        conditions: { allOf: [], anyOf: [], oneOf: [] },
      });

      const occurredAt = new Date("2026-04-19T12:00:00Z");
      await publishAutomationEventAsync(eventBus, triggeredAutomations, occurredAt);

      const result = manager.activeNotifications;
      assert.equal(result.lastRunAt, occurredAt.getTime());
      assert.lengthOf(result.notifications, 2);
      const notifs = result.notifications;
      assert.equal(notifs[0]!.subject, "Subject 1");
      assert.equal(notifs[1]!.subject, "Subject 2");
    });

    it("should return multiple active notifications for one automation when it has multiple actions", async () => {
      const sprootDB = createStubSprootDB();
      const eventBus = new MemoryEventBus(mockLogger);
      sprootDB.automations.actions.notification.getAllAsync.resolves([
        {
          id: 1,
          automationId: 1,
          subject: "Subject 1",
          content: "Content 1",
        },
        {
          id: 2,
          automationId: 1,
          subject: "Subject 2",
          content: "Content 2",
        },
      ]);

      using manager = await NotificationActionManager.createInstanceAsync(
        sprootDB,
        eventBus,
        mockLogger,
      );

      const triggeredAutomations = new Map<number, any>();
      triggeredAutomations.set(1, {
        automationId: 1,
        automationName: "automation1",
        operator: "or",
        conditions: { allOf: [], anyOf: [], oneOf: [] },
      });

      const occurredAt = new Date("2026-04-19T12:30:00Z");
      await publishAutomationEventAsync(eventBus, triggeredAutomations, occurredAt);

      const result = manager.activeNotifications;
      assert.equal(result.lastRunAt, occurredAt.getTime());
      assert.lengthOf(result.notifications, 2);
      assert.sameMembers(
        result.notifications.map((notification) => notification.notificationId),
        [1, 2],
      );
    });

    it("should update lastRunAt when events are processed", async () => {
      const sprootDB = createStubSprootDB();
      const eventBus = new MemoryEventBus(mockLogger);
      sprootDB.automations.actions.notification.getAllAsync.resolves([
        {
          id: 1,
          automationId: 1,
          subject: "Test",
          content: "Content",
        },
      ]);

      using manager = await NotificationActionManager.createInstanceAsync(
        sprootDB,
        eventBus,
        mockLogger,
      );

      const triggeredAutomations = new Map<number, any>();
      triggeredAutomations.set(1, {
        automationId: 1,
        automationName: "testAutomation",
        operator: "or",
        conditions: { allOf: [], anyOf: [], oneOf: [] },
      });

      const event1Time = new Date("2026-04-19T10:00:00Z");
      await publishAutomationEventAsync(eventBus, triggeredAutomations, event1Time);

      assert.equal(manager.activeNotifications.lastRunAt, event1Time.getTime());

      const event2Time = new Date("2026-04-19T11:00:00Z");
      await publishAutomationEventAsync(eventBus, triggeredAutomations, event2Time);

      assert.equal(manager.activeNotifications.lastRunAt, event2Time.getTime());
    });
  });

  describe("reloadActionsAsync", () => {
    it("should load notification actions from database on creation", async () => {
      const sprootDB = createStubSprootDB();
      const eventBus = new MemoryEventBus(mockLogger);
      sprootDB.automations.actions.notification.getAllAsync.resolves([
        {
          id: 1,
          automationId: 1,
          subject: "Initial Subject",
          content: "Initial Content",
        },
      ]);
      using manager = await NotificationActionManager.createInstanceAsync(
        sprootDB,
        eventBus,
        mockLogger,
      );

      const triggeredAutomations = new Map<number, any>();
      triggeredAutomations.set(1, {
        automationId: 1,
        automationName: "testAutomation",
        operator: "or",
        conditions: { allOf: [], anyOf: [], oneOf: [] },
      });

      await publishAutomationEventAsync(eventBus, triggeredAutomations);

      const result = manager.activeNotifications;
      const notif = result.notifications[0]!;
      assert.equal(notif.subject, "Initial Subject");
      assert.equal(notif.content, "Initial Content");
    });

    it("should reload actions from database on NotificationActionsUpdated event", async () => {
      const sprootDB = createStubSprootDB();
      const eventBus = new MemoryEventBus(mockLogger);
      sprootDB.automations.actions.notification.getAllAsync.resolves([
        {
          id: 1,
          automationId: 1,
          subject: "Original Subject",
          content: "Original Content",
        },
      ]);
      using manager = await NotificationActionManager.createInstanceAsync(
        sprootDB,
        eventBus,
        mockLogger,
      );

      const triggeredAutomations = new Map<number, any>();
      triggeredAutomations.set(1, {
        automationId: 1,
        automationName: "testAutomation",
        operator: "or",
        conditions: { allOf: [], anyOf: [], oneOf: [] },
      });

      await publishAutomationEventAsync(eventBus, triggeredAutomations);
      const notif1 = manager.activeNotifications.notifications[0]!;
      assert.equal(notif1.subject, "Original Subject");

      sprootDB.automations.actions.notification.getAllAsync.resolves([
        {
          id: 1,
          automationId: 1,
          subject: "Updated Subject",
          content: "Updated Content",
        },
      ]);

      await eventBus.publishAsync(new NotificationActionsModifiedEvent({}));
      await new Promise((resolve) => setImmediate(resolve));

      await publishAutomationEventAsync(eventBus, triggeredAutomations);

      const notif2 = manager.activeNotifications.notifications[0]!;
      assert.equal(notif2.subject, "Updated Subject");
      assert.equal(notif2.content, "Updated Content");
    });
  });

  describe("createInstanceAsync", () => {
    it("should create manager and load actions", async () => {
      const sprootDB = createStubSprootDB();
      const eventBus = new MemoryEventBus(mockLogger);
      sprootDB.automations.actions.notification.getAllAsync.resolves([
        {
          id: 1,
          automationId: 1,
          subject: "Subject",
          content: "Content",
        },
      ]);

      using manager = await NotificationActionManager.createInstanceAsync(
        sprootDB,
        eventBus,
        mockLogger,
      );

      assert.isNotNull(manager);
      assert.isDefined(manager.activeNotifications);
    });

    it("should handle empty action list", async () => {
      const sprootDB = createStubSprootDB();
      const eventBus = new MemoryEventBus(mockLogger);
      sprootDB.automations.actions.notification.getAllAsync.resolves([]);

      using manager = await NotificationActionManager.createInstanceAsync(
        sprootDB,
        eventBus,
        mockLogger,
      );

      const result = manager.activeNotifications;
      assert.equal(result.lastRunAt, 0);
      assert.lengthOf(result.notifications, 0);
    });
  });

  describe("NotificationAction", () => {
    it("should create action with correct properties", () => {
      const action = new NotificationAction({
        id: 1,
        automationId: 2,
        subject: "Test Subject",
        content: "Test Content",
      });

      assert.equal(action.id, 1);
      assert.equal(action.automationId, 2);
      assert.equal(action.subject, "Test Subject");
      assert.equal(action.content, "Test Content");
    });

    it("should handle complex subject and content strings", () => {
      const action = new NotificationAction({
        id: 100,
        automationId: 5,
        subject: "Greenhouse Alert: Temperature Critical",
        content: "Temperature has exceeded 30C in Zone A. Current: 32.5C",
      });

      assert.equal(action.id, 100);
      assert.equal(action.automationId, 5);
      assert.include(action.subject, "Temperature");
      assert.include(action.content, "32.5C");
    });
  });

  describe("event listener cleanup", () => {
    it("should remove event listeners when disposed", async () => {
      const sprootDB = createStubSprootDB();
      const eventBus = new MemoryEventBus(mockLogger);
      sprootDB.automations.actions.notification.getAllAsync.resolves([]);

      const manager = await NotificationActionManager.createInstanceAsync(
        sprootDB,
        eventBus,
        mockLogger,
      );

      manager[Symbol.dispose]();

      await publishAutomationEventAsync(eventBus, new Map());

      assert.deepEqual(manager.activeNotifications, { lastRunAt: 0, notifications: [] });
    });
  });

  describe("error handling", () => {
    it("should log error when reloading actions fails", async () => {
      const errorCalls: string[] = [];
      const mockErrorLogger = {
        error: sinon.stub().callsFake((...args: any[]) => errorCalls.push(args.join(" "))),
        info: sinon.stub(),
        debug: sinon.stub(),
        warn: sinon.stub(),
        verbose: sinon.stub(),
        child: sinon.stub(),
      } as unknown as winston.Logger;
      const sprootDB = createStubSprootDB();
      const eventBus = new MemoryEventBus(mockErrorLogger);
      sprootDB.automations.actions.notification.getAllAsync.rejects(new Error("DB Error"));

      await NotificationActionManager.createInstanceAsync(sprootDB, eventBus, mockErrorLogger);

      assert.equal(errorCalls.length, 1);
    });
  });
});
