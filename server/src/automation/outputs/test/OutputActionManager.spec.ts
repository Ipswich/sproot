import { OutputActionManager } from "../OutputActionManager";
import { OutputAction } from "../OutputAction";
import { AutomationEvent } from "../../AutomationEvent";
import { assert } from "chai";
import sinon from "sinon";
import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import winston from "winston";
import { AutomationService } from "../../AutomationService";

describe("OutputActionManager.ts tests", () => {
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
  const mockLogger = winston.createLogger();

  describe("handleAutomationEvent", () => {
    it("should return the action value with a single automation trigger", async () => {
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getAutomationsAsync.resolves([
        {
          automationId: 1,
          name: "testAutomation",
          operator: "or",
          enabled: true,
        },
      ]);
      const mockAutomationService = await AutomationService.createInstanceAsync(sprootDB);
      sprootDB.getOutputActionsByOutputIdAsync.resolves([
        {
          id: 1,
          automationId: 1,
          outputId: 1,
          value: 75,
        },
      ]);

      using manager = await OutputActionManager.createInstanceAsync(
        1,
        async () => {},
        mockAutomationService,
        sprootDB,
        mockLogger,
        60, // 60 second timeout
      );

      // Create event with triggered automation
      const triggeredAutomations = new Map<number, any>();
      triggeredAutomations.set(1, {
        automationId: 1,
        automationName: "testAutomation",
        operator: "or",
        conditions: { allOf: [], anyOf: [], oneOf: [] },
      });

      const event = new AutomationEvent(triggeredAutomations);
      mockAutomationService.emit("TriggeredAutomations", event);
      await new Promise((res) => setImmediate(res));

      assert.equal(manager.lastResult, 75);
    });

    it("should return 0 (off) when no automations trigger", async () => {
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getAutomationsAsync.resolves([
        {
          automationId: 1,
          name: "testAutomation",
          operator: "or",
          enabled: true,
        },
      ]);
      const mockAutomationService = await AutomationService.createInstanceAsync(sprootDB);
      sprootDB.getOutputActionsByOutputIdAsync.resolves([
        {
          id: 1,
          automationId: 1,
          outputId: 1,
          value: 75,
        },
      ]);
      using manager = await OutputActionManager.createInstanceAsync(
        1,
        async () => {},
        mockAutomationService,
        sprootDB,
        mockLogger,
        60,
      );

      // Create event with no triggered automations
      const event = new AutomationEvent(new Map());
      mockAutomationService.emit("TriggeredAutomations", event);
      await new Promise((res) => setImmediate(res));

      assert.equal(manager.lastResult, 0);
    });

    it("should return 0 (off) when collision detected (multiple values)", async () => {
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getAutomationsAsync.resolves([
        {
          automationId: 1,
          name: "testAutomation",
          operator: "or",
          enabled: true,
        },
      ]);
      const mockAutomationService = await AutomationService.createInstanceAsync(sprootDB);

      sprootDB.getOutputActionsByOutputIdAsync.resolves([
        {
          id: 1,
          automationId: 1,
          outputId: 1,
          value: 50,
        },
        {
          id: 2,
          automationId: 2,
          outputId: 1,
          value: 75,
        },
      ]);

      using manager = await OutputActionManager.createInstanceAsync(
        1,
        async () => {},
        mockAutomationService,
        sprootDB,
        mockLogger,
        60,
      );

      // Create event with both automations triggered
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

      const event = new AutomationEvent(triggeredAutomations);
      mockAutomationService.emit("TriggeredAutomations", event);
      await new Promise((res) => setImmediate(res));

      assert.equal(manager.lastResult, 0);
    });

    it("should return value when multiple automations trigger with same value", async () => {
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getAutomationsAsync.resolves([
        {
          automationId: 1,
          name: "testAutomation",
          operator: "or",
          enabled: true,
        },
      ]);
      const mockAutomationService = await AutomationService.createInstanceAsync(sprootDB);
      sprootDB.getOutputActionsByOutputIdAsync.resolves([
        {
          id: 1,
          automationId: 1,
          outputId: 1,
          value: 50,
        },
        {
          id: 2,
          automationId: 2,
          outputId: 1,
          value: 50,
        },
      ]);
      using manager = await OutputActionManager.createInstanceAsync(
        1,
        async () => {},
        mockAutomationService,
        sprootDB,
        mockLogger,
        60,
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

      const event = new AutomationEvent(triggeredAutomations);
      mockAutomationService.emit("TriggeredAutomations", event);
      await new Promise((res) => setImmediate(res));
      assert.equal(manager.lastResult, 50);
    });

    it("should respect timeout (not process event too soon)", async () => {
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getAutomationsAsync.resolves([
        {
          automationId: 1,
          name: "testAutomation",
          operator: "or",
          enabled: true,
        },
      ]);
      const mockAutomationService = await AutomationService.createInstanceAsync(sprootDB);
      sprootDB.getOutputActionsByOutputIdAsync.resolves([
        {
          id: 1,
          automationId: 1,
          outputId: 1,
          value: 75,
        },
      ]);
      using manager = await OutputActionManager.createInstanceAsync(
        1,
        async () => {},
        mockAutomationService,
        sprootDB,
        mockLogger,
        60, // 60 second timeout
      );

      const triggeredAutomations = new Map<number, any>();
      triggeredAutomations.set(1, {
        automationId: 1,
        automationName: "testAutomation",
        operator: "or",
        conditions: { allOf: [], anyOf: [], oneOf: [] },
      });

      const event = new AutomationEvent(triggeredAutomations);

      // First call should succeed
      mockAutomationService.emit("TriggeredAutomations", event);
      await new Promise((res) => setImmediate(res));
      assert.equal(manager.lastResult, 75);

      // Second call immediately should be blocked by timeout
      mockAutomationService.emit("TriggeredAutomations", event);
      await new Promise((res) => setImmediate(res));
      assert.isUndefined(manager.lastResult);
    });
  });

  describe("reloadActionsAsync", () => {
    it("should load actions from database", async () => {
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getAutomationsAsync.resolves([
        {
          automationId: 1,
          name: "testAutomation",
          operator: "or",
          enabled: true,
        },
      ]);
      const mockAutomationService = await AutomationService.createInstanceAsync(sprootDB);
      sprootDB.getOutputActionsByOutputIdAsync.resolves([
        {
          id: 1,
          automationId: 1,
          outputId: 1,
          value: 50,
        },
      ]);
      using manager = await OutputActionManager.createInstanceAsync(
        1,
        async () => {},
        mockAutomationService,
        sprootDB,
        mockLogger,
        0,
      );

      const triggeredAutomations = new Map<number, any>();
      triggeredAutomations.set(1, {
        automationId: 1,
        automationName: "testAutomation",
        operator: "or",
        conditions: { allOf: [], anyOf: [], oneOf: [] },
      });

      const event = new AutomationEvent(triggeredAutomations);

      // Call with value 50
      mockAutomationService.emit("TriggeredAutomations", event);
      await new Promise((res) => setImmediate(res));
      assert.equal(manager.lastResult, 50);
    });

    it("should load actions from database on 'OutputActionsUpdated' event", async () => {
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getAutomationsAsync.resolves([
        {
          automationId: 1,
          name: "testAutomation",
          operator: "or",
          enabled: true,
        },
      ]);
      const mockAutomationService = await AutomationService.createInstanceAsync(sprootDB);
      sprootDB.getOutputActionsByOutputIdAsync.resolves([
        {
          id: 1,
          automationId: 1,
          outputId: 1,
          value: 50,
        },
      ]);
      using manager = await OutputActionManager.createInstanceAsync(
        1,
        async () => {},
        mockAutomationService,
        sprootDB,
        mockLogger,
        0,
      );

      const triggeredAutomations = new Map<number, any>();
      triggeredAutomations.set(1, {
        automationId: 1,
        automationName: "testAutomation",
        operator: "or",
        conditions: { allOf: [], anyOf: [], oneOf: [] },
      });

      const event = new AutomationEvent(triggeredAutomations);

      // First call with value 50
      mockAutomationService.emit("TriggeredAutomations", event);
      await new Promise((res) => setImmediate(res));
      assert.equal(manager.lastResult, 50);

      // Change the action value
      sprootDB.getOutputActionsByOutputIdAsync.resolves([
        {
          id: 1,
          automationId: 1,
          outputId: 1,
          value: 75,
        },
      ]);

      // Second call should see updated value
      mockAutomationService.emit("OutputActionsUpdated");
      await new Promise((res) => setImmediate(res));
      mockAutomationService.emit("TriggeredAutomations", event);
      await new Promise((res) => setImmediate(res));
      assert.equal(manager.lastResult, 75);
    });
  });

  describe("createInstanceAsync", () => {
    it("should create manager and load actions", async () => {
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getAutomationsAsync.resolves([
        {
          automationId: 1,
          name: "testAutomation",
          operator: "or",
          enabled: true,
        },
      ]);
      const mockAutomationService = await AutomationService.createInstanceAsync(sprootDB);

      sprootDB.getOutputActionsByOutputIdAsync.resolves([
        {
          id: 1,
          automationId: 1,
          outputId: 1,
          value: 50,
        },
        {
          id: 2,
          automationId: 2,
          outputId: 1,
          value: 75,
        },
      ]);

      using manager = await OutputActionManager.createInstanceAsync(
        1,
        async () => {},
        mockAutomationService,
        sprootDB,
        mockLogger,
        60,
      );

      // Manager should be created successfully
      assert.isNotNull(manager);
    });
  });

  describe("OutputAction", () => {
    it("should create action with correct properties", () => {
      const action = new OutputAction({
        id: 1,
        automationId: 1,
        outputId: 1,
        value: 75,
      });

      assert.equal(action.id, 1);
      assert.equal(action.automationId, 1);
      assert.equal(action.outputId, 1);
      assert.equal(action.value, 75);
    });
  });
});
