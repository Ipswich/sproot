import { NotificationActionManager } from "../NotificationActionManager";
import { NotificationAction } from "../NotificationAction";
import { AutomationEvent } from "../../AutomationEvent";
import { assert } from "chai";
import sinon from "sinon";
import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import winston from "winston";
import { AutomationService } from "../../AutomationService";
import {
  NOTIFICATION_ACTIONS_UPDATED_EVENT,
  AUTOMATIONS_TRIGGERED_EVENT,
} from "../../../utils/EventConstants";

describe("NotificationActionManager.ts tests", () => {
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

  describe("activeNotifications", () => {
    it("should return active notifications with correct structure", async () => {
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getAutomationsAsync.resolves([
        {
          id: 1,
          name: "testAutomation",
          operator: "or",
          enabled: true,
        },
      ]);
      const mockAutomationService = await AutomationService.createInstanceAsync(
        sprootDB,
        mockLogger,
      );
      sprootDB.getNotificationActionsAsync.resolves([
        {
          id: 1,
          automationId: 1,
          subject: "Test Subject",
          content: "Test Content",
        },
      ]);

      using manager = await NotificationActionManager.createInstanceAsync(
        mockAutomationService,
        sprootDB,
        mockLogger,
      );

      const triggeredAutomations = new Map<number, any>();
      triggeredAutomations.set(1, {
        automationId: 1,
        automationName: "testAutomation",
        operator: "or",
        conditions: { allOf: [], anyOf: [], oneOf: [] },
      });

      const event = new AutomationEvent(triggeredAutomations, new Date("2026-04-19T10:00:00Z"));
      mockAutomationService.emit(AUTOMATIONS_TRIGGERED_EVENT, event);
      await new Promise((res) => setImmediate(res));

      const result = manager.activeNotifications;
      assert.equal(result.lastRunAt, event.timestamp.getTime());
      assert.lengthOf(result.notifications, 1);
      assert.equal(result.notifications[0]!.notificationId, 1);
      assert.equal(result.notifications[0]!.subject, "Test Subject");
      assert.equal(result.notifications[0]!.content, "Test Content");
      assert.equal(result.notifications[0]!.payload.automationId, 1);
    });

    it("should return empty notifications when no automations trigger", async () => {
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getAutomationsAsync.resolves([
        {
          id: 1,
          name: "testAutomation",
          operator: "or",
          enabled: true,
        },
      ]);
      const mockAutomationService = await AutomationService.createInstanceAsync(
        sprootDB,
        mockLogger,
      );
      sprootDB.getNotificationActionsAsync.resolves([
        {
          id: 1,
          automationId: 1,
          subject: "Test Subject",
          content: "Test Content",
        },
      ]);

      using manager = await NotificationActionManager.createInstanceAsync(
        mockAutomationService,
        sprootDB,
        mockLogger,
      );

      const event = new AutomationEvent(new Map());
      mockAutomationService.emit(AUTOMATIONS_TRIGGERED_EVENT, event);
      await new Promise((res) => setImmediate(res));

      const result = manager.activeNotifications;
      assert.equal(result.lastRunAt, event.timestamp.getTime());
      assert.lengthOf(result.notifications, 0);
    });

    it("should return multiple active notifications when multiple automations trigger", async () => {
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getAutomationsAsync.resolves([
        {
          id: 1,
          name: "automation1",
          operator: "or",
          enabled: true,
        },
        {
          id: 2,
          name: "automation2",
          operator: "or",
          enabled: true,
        },
      ]);
      const mockAutomationService = await AutomationService.createInstanceAsync(
        sprootDB,
        mockLogger,
      );
      sprootDB.getNotificationActionsAsync.resolves([
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
        mockAutomationService,
        sprootDB,
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

      const event = new AutomationEvent(triggeredAutomations, new Date("2026-04-19T12:00:00Z"));
      mockAutomationService.emit(AUTOMATIONS_TRIGGERED_EVENT, event);
      await new Promise((res) => setImmediate(res));

      const result = manager.activeNotifications;
      assert.equal(result.lastRunAt, event.timestamp.getTime());
      assert.lengthOf(result.notifications, 2);
      const notifs = result.notifications;
      assert.equal(notifs[0]!.subject, "Subject 1");
      assert.equal(notifs[1]!.subject, "Subject 2");
    });

    it("should return multiple active notifications for one automation when it has multiple actions", async () => {
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getAutomationsAsync.resolves([
        {
          id: 1,
          name: "automation1",
          operator: "or",
          enabled: true,
        },
      ]);
      const mockAutomationService = await AutomationService.createInstanceAsync(
        sprootDB,
        mockLogger,
      );
      sprootDB.getNotificationActionsAsync.resolves([
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
        mockAutomationService,
        sprootDB,
        mockLogger,
      );

      const triggeredAutomations = new Map<number, any>();
      triggeredAutomations.set(1, {
        automationId: 1,
        automationName: "automation1",
        operator: "or",
        conditions: { allOf: [], anyOf: [], oneOf: [] },
      });

      const event = new AutomationEvent(triggeredAutomations, new Date("2026-04-19T12:30:00Z"));
      mockAutomationService.emit(AUTOMATIONS_TRIGGERED_EVENT, event);
      await new Promise((res) => setImmediate(res));

      const result = manager.activeNotifications;
      assert.equal(result.lastRunAt, event.timestamp.getTime());
      assert.lengthOf(result.notifications, 2);
      assert.sameMembers(
        result.notifications.map((notification) => notification.notificationId),
        [1, 2],
      );
    });

    it("should update lastRunAt when events are processed", async () => {
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getAutomationsAsync.resolves([
        {
          id: 1,
          name: "testAutomation",
          operator: "or",
          enabled: true,
        },
      ]);
      const mockAutomationService = await AutomationService.createInstanceAsync(
        sprootDB,
        mockLogger,
      );
      sprootDB.getNotificationActionsAsync.resolves([
        {
          id: 1,
          automationId: 1,
          subject: "Test",
          content: "Content",
        },
      ]);

      using manager = await NotificationActionManager.createInstanceAsync(
        mockAutomationService,
        sprootDB,
        mockLogger,
      );

      const triggeredAutomations = new Map<number, any>();
      triggeredAutomations.set(1, {
        automationId: 1,
        automationName: "testAutomation",
        operator: "or",
        conditions: { allOf: [], anyOf: [], oneOf: [] },
      });

      const event1 = new AutomationEvent(triggeredAutomations, new Date("2026-04-19T10:00:00Z"));
      mockAutomationService.emit(AUTOMATIONS_TRIGGERED_EVENT, event1);
      await new Promise((res) => setImmediate(res));

      assert.equal(manager.activeNotifications.lastRunAt, event1.timestamp.getTime());

      const event2 = new AutomationEvent(triggeredAutomations, new Date("2026-04-19T11:00:00Z"));
      mockAutomationService.emit(AUTOMATIONS_TRIGGERED_EVENT, event2);
      await new Promise((res) => setImmediate(res));

      assert.equal(manager.activeNotifications.lastRunAt, event2.timestamp.getTime());
    });
  });

  describe("reloadActionsAsync", () => {
    it("should load notification actions from database on creation", async () => {
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getAutomationsAsync.resolves([
        {
          id: 1,
          name: "testAutomation",
          operator: "or",
          enabled: true,
        },
      ]);
      sprootDB.getNotificationActionsAsync.resolves([
        {
          id: 1,
          automationId: 1,
          subject: "Initial Subject",
          content: "Initial Content",
        },
      ]);

      const mockAutomationService = await AutomationService.createInstanceAsync(
        sprootDB,
        mockLogger,
      );

      using manager = await NotificationActionManager.createInstanceAsync(
        mockAutomationService,
        sprootDB,
        mockLogger,
      );

      const triggeredAutomations = new Map<number, any>();
      triggeredAutomations.set(1, {
        automationId: 1,
        automationName: "testAutomation",
        operator: "or",
        conditions: { allOf: [], anyOf: [], oneOf: [] },
      });

      const event = new AutomationEvent(triggeredAutomations);
      mockAutomationService.emit(AUTOMATIONS_TRIGGERED_EVENT, event);
      await new Promise((res) => setImmediate(res));

      const result = manager.activeNotifications;
      const notif = result.notifications[0]!;
      assert.equal(notif.subject, "Initial Subject");
      assert.equal(notif.content, "Initial Content");
    });

    it("should reload actions from database on NotificationActionsUpdated event", async () => {
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getAutomationsAsync.resolves([
        {
          id: 1,
          name: "testAutomation",
          operator: "or",
          enabled: true,
        },
      ]);
      sprootDB.getNotificationActionsAsync.resolves([
        {
          id: 1,
          automationId: 1,
          subject: "Original Subject",
          content: "Original Content",
        },
      ]);
      const mockAutomationService = await AutomationService.createInstanceAsync(
        sprootDB,
        mockLogger,
      );

      using manager = await NotificationActionManager.createInstanceAsync(
        mockAutomationService,
        sprootDB,
        mockLogger,
      );

      const triggeredAutomations = new Map<number, any>();
      triggeredAutomations.set(1, {
        automationId: 1,
        automationName: "testAutomation",
        operator: "or",
        conditions: { allOf: [], anyOf: [], oneOf: [] },
      });

      const event = new AutomationEvent(triggeredAutomations);

      mockAutomationService.emit(AUTOMATIONS_TRIGGERED_EVENT, event);
      await new Promise((res) => setImmediate(res));
      const notif1 = manager.activeNotifications.notifications[0]!;
      assert.equal(notif1.subject, "Original Subject");

      sprootDB.getNotificationActionsAsync.resolves([
        {
          id: 1,
          automationId: 1,
          subject: "Updated Subject",
          content: "Updated Content",
        },
      ]);

      mockAutomationService.emit(NOTIFICATION_ACTIONS_UPDATED_EVENT);
      await new Promise((res) => setImmediate(res));

      mockAutomationService.emit(AUTOMATIONS_TRIGGERED_EVENT, event);
      await new Promise((res) => setImmediate(res));

      const notif2 = manager.activeNotifications.notifications[0]!;
      assert.equal(notif2.subject, "Updated Subject");
      assert.equal(notif2.content, "Updated Content");
    });
  });

  describe("createInstanceAsync", () => {
    it("should create manager and load actions", async () => {
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getAutomationsAsync.resolves([
        {
          id: 1,
          name: "testAutomation",
          operator: "or",
          enabled: true,
        },
      ]);
      sprootDB.getNotificationActionsAsync.resolves([
        {
          id: 1,
          automationId: 1,
          subject: "Subject",
          content: "Content",
        },
      ]);

      using manager = await NotificationActionManager.createInstanceAsync(
        await AutomationService.createInstanceAsync(sprootDB, mockLogger),
        sprootDB,
        mockLogger,
      );

      assert.isNotNull(manager);
      assert.isDefined(manager.activeNotifications);
    });

    it("should handle empty action list", async () => {
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getAutomationsAsync.resolves([]);
      sprootDB.getNotificationActionsAsync.resolves([]);

      using manager = await NotificationActionManager.createInstanceAsync(
        await AutomationService.createInstanceAsync(sprootDB, mockLogger),
        sprootDB,
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
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getAutomationsAsync.resolves([]);
      sprootDB.getNotificationActionsAsync.resolves([]);

      const mockAutomationService = await AutomationService.createInstanceAsync(
        sprootDB,
        mockLogger,
      );

      const manager = await NotificationActionManager.createInstanceAsync(
        mockAutomationService,
        sprootDB,
        mockLogger,
      );

      manager[Symbol.dispose]();

      const event = new AutomationEvent(new Map());
      assert.doesNotThrow(() => {
        mockAutomationService.emit(AUTOMATIONS_TRIGGERED_EVENT, event);
      });
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
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getAutomationsAsync.resolves([]);
      sprootDB.getNotificationActionsAsync.rejects(new Error("DB Error"));

      await NotificationActionManager.createInstanceAsync(
        await AutomationService.createInstanceAsync(sprootDB, mockErrorLogger),
        sprootDB,
        mockErrorLogger,
      );

      assert.equal(errorCalls.length, 1);
    });
  });
});
