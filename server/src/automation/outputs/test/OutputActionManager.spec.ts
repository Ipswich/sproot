import { OutputActionManager } from "../OutputActionManager";
import { OutputAction } from "../OutputAction";
import { assert } from "chai";
import sinon from "sinon";
import winston from "winston";
import { MemoryEventBus } from "../../../eventbus/MemoryEventBus";
import { AutomationsTriggeredEvent } from "../../../eventbus/events/automations/AutomationsTriggeredEvent";
import { OutputActionsModifiedEvent } from "../../../eventbus/events/actions/OutputActionsModifiedEvent";
import { IOutputActionsRepository } from "../../../database/repositories/automations/actions/IOutputActionsRepository";

const mockOutputActionsRepo: IOutputActionsRepository = {
  getAsync: async () => [],
  addAsync: async () => 0,
  updateAsync: async () => {},
  deleteAsync: async () => {},
  getAllAsync: async () => [],
  getOutputActionAsync: async () => [],
  getActionsByOutputIdAsync: async () => [],
};

const createStubSprootDB = () => {
  const outputActionsRepo = mockOutputActionsRepo;
  outputActionsRepo.getActionsByOutputIdAsync = sinon.stub();
  const sprootDB = {
    automations: {
      actions: {
        output: outputActionsRepo,
      },
    },
  } as any;
  return sprootDB;
};

describe("OutputActionManager.ts tests", () => {
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

  describe("handleAutomationEvent", () => {
    it("should return the action value with a single automation trigger", async () => {
      const sprootDB = createStubSprootDB();
      const eventBus = new MemoryEventBus(mockLogger);
      sprootDB.automations.actions.output.getActionsByOutputIdAsync.resolves([
        {
          id: 1,
          automationId: 1,
          outputId: 1,
          value: 75,
          precedence: "Normal",
        },
      ]);

      using manager = await OutputActionManager.createInstanceAsync(
        1,
        async () => {},
        eventBus,
        sprootDB.automations.actions.output,
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

      await publishAutomationEventAsync(eventBus, triggeredAutomations);

      assert.equal(manager.lastResult, 75);
    });

    it("should return 0 (off) when no automations trigger", async () => {
      const sprootDB = createStubSprootDB();
      const eventBus = new MemoryEventBus(mockLogger);
      sprootDB.automations.actions.output.getActionsByOutputIdAsync.resolves([
        {
          id: 1,
          automationId: 1,
          outputId: 1,
          value: 75,
          precedence: "Normal",
        },
      ]);
      using manager = await OutputActionManager.createInstanceAsync(
        1,
        async () => {},
        eventBus,
        sprootDB.automations.actions.output,
        mockLogger,
        60,
      );

      // Create event with no triggered automations
      await publishAutomationEventAsync(eventBus, new Map());

      assert.equal(manager.lastResult, 0);
    });

    it("should do nothing when highest-precedence actions conflict", async () => {
      const sprootDB = createStubSprootDB();
      const eventBus = new MemoryEventBus(mockLogger);

      sprootDB.automations.actions.output.getActionsByOutputIdAsync.resolves([
        {
          id: 1,
          automationId: 1,
          outputId: 1,
          value: 50,
          precedence: "High",
        },
        {
          id: 2,
          automationId: 2,
          outputId: 1,
          value: 75,
          precedence: "High",
        },
      ]);

      using manager = await OutputActionManager.createInstanceAsync(
        1,
        async () => {},
        eventBus,
        sprootDB.automations.actions.output,
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

      await publishAutomationEventAsync(eventBus, triggeredAutomations);

      assert.isUndefined(manager.lastResult);
      assert.deepEqual(manager.activeConflict, {
        precedence: "High",
        actions: [
          { automationId: 1, automationName: "automation1", value: 50 },
          { automationId: 2, automationName: "automation2", value: 75 },
        ],
      });
    });

    it("should ignore lower-precedence disagreements when higher-precedence actions agree", async () => {
      const sprootDB = createStubSprootDB();
      const eventBus = new MemoryEventBus(mockLogger);
      sprootDB.automations.actions.output.getActionsByOutputIdAsync.resolves([
        {
          id: 1,
          automationId: 1,
          outputId: 1,
          value: 50,
          precedence: "Normal",
        },
        {
          id: 2,
          automationId: 2,
          outputId: 1,
          value: 75,
          precedence: "Normal",
        },
        {
          id: 3,
          automationId: 3,
          outputId: 1,
          value: 50,
          precedence: "Emergency",
        },
        {
          id: 4,
          automationId: 4,
          outputId: 1,
          value: 50,
          precedence: "Emergency",
        },
      ]);
      using manager = await OutputActionManager.createInstanceAsync(
        1,
        async () => {},
        eventBus,
        sprootDB.automations.actions.output,
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
      triggeredAutomations.set(3, {
        automationId: 3,
        automationName: "automation3",
        operator: "or",
        conditions: { allOf: [], anyOf: [], oneOf: [] },
      });
      triggeredAutomations.set(4, {
        automationId: 4,
        automationName: "automation4",
        operator: "or",
        conditions: { allOf: [], anyOf: [], oneOf: [] },
      });

      await publishAutomationEventAsync(eventBus, triggeredAutomations);

      assert.equal(manager.lastResult, 50);
      assert.isNull(manager.activeConflict);
    });

    it("should return value when multiple automations trigger with same highest-precedence value", async () => {
      const sprootDB = createStubSprootDB();
      const eventBus = new MemoryEventBus(mockLogger);
      sprootDB.automations.actions.output.getActionsByOutputIdAsync.resolves([
        {
          id: 1,
          automationId: 1,
          outputId: 1,
          value: 50,
          precedence: "High",
        },
        {
          id: 2,
          automationId: 2,
          outputId: 1,
          value: 50,
          precedence: "High",
        },
      ]);
      using manager = await OutputActionManager.createInstanceAsync(
        1,
        async () => {},
        eventBus,
        sprootDB.automations.actions.output,
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

      await publishAutomationEventAsync(eventBus, triggeredAutomations);

      assert.equal(manager.lastResult, 50);
    });

    it("should respect timeout (not process event too soon)", async () => {
      const sprootDB = createStubSprootDB();
      const eventBus = new MemoryEventBus(mockLogger);
      sprootDB.automations.actions.output.getActionsByOutputIdAsync.resolves([
        {
          id: 1,
          automationId: 1,
          outputId: 1,
          value: 75,
          precedence: "Normal",
        },
      ]);
      using manager = await OutputActionManager.createInstanceAsync(
        1,
        async () => {},
        eventBus,
        sprootDB.automations.actions.output,
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

      // First call should succeed
      await publishAutomationEventAsync(
        eventBus,
        triggeredAutomations,
        new Date("2026-05-10T10:00:00Z"),
      );
      assert.equal(manager.lastResult, 75);

      // Second call immediately should be blocked by timeout
      await publishAutomationEventAsync(
        eventBus,
        triggeredAutomations,
        new Date("2026-05-10T10:00:30Z"),
      );
      assert.isUndefined(manager.lastResult);
    });
  });

  describe("reloadActionsAsync", () => {
    it("should load actions from database", async () => {
      const sprootDB = createStubSprootDB();
      const eventBus = new MemoryEventBus(mockLogger);
      sprootDB.automations.actions.output.getActionsByOutputIdAsync.resolves([
        {
          id: 1,
          automationId: 1,
          outputId: 1,
          value: 50,
          precedence: "Normal",
        },
      ]);
      using manager = await OutputActionManager.createInstanceAsync(
        1,
        async () => {},
        eventBus,
        sprootDB.automations.actions.output,
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

      // Call with value 50
      await publishAutomationEventAsync(eventBus, triggeredAutomations);
      assert.equal(manager.lastResult, 50);
    });

    it("should keep the highest-precedence action per automation regardless of database row order", async () => {
      const sprootDB = createStubSprootDB();
      const eventBus = new MemoryEventBus(mockLogger);
      sprootDB.automations.actions.output.getActionsByOutputIdAsync.resolves([
        {
          id: 2,
          automationId: 1,
          outputId: 1,
          value: 0,
          precedence: "High",
          automationName: "automation1",
        },
        {
          id: 1,
          automationId: 1,
          outputId: 1,
          value: 100,
          precedence: "Normal",
          automationName: "automation1",
        },
        {
          id: 3,
          automationId: 2,
          outputId: 1,
          value: 100,
          precedence: "High",
          automationName: "automation2",
        },
      ]);

      using manager = await OutputActionManager.createInstanceAsync(
        1,
        async () => {},
        eventBus,
        sprootDB.automations.actions.output,
        mockLogger,
        0,
      );

      assert.deepEqual(manager.actionWarnings, [
        {
          precedence: "High",
          actions: [
            { automationId: 1, automationName: "automation1" },
            { automationId: 2, automationName: "automation2" },
          ],
        },
      ]);

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

      await publishAutomationEventAsync(eventBus, triggeredAutomations);

      assert.deepEqual(manager.activeConflict, {
        precedence: "High",
        actions: [
          { automationId: 1, automationName: "automation1", value: 0 },
          { automationId: 2, automationName: "automation2", value: 100 },
        ],
      });
    });

    it("should load actions from database on 'OutputActionsUpdated' event", async () => {
      const sprootDB = createStubSprootDB();
      const eventBus = new MemoryEventBus(mockLogger);
      sprootDB.automations.actions.output.getActionsByOutputIdAsync.resolves([
        {
          id: 1,
          automationId: 1,
          outputId: 1,
          value: 50,
          precedence: "Normal",
        },
      ]);
      using manager = await OutputActionManager.createInstanceAsync(
        1,
        async () => {},
        eventBus,
        sprootDB.automations.actions.output,
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

      // First call with value 50
      await publishAutomationEventAsync(eventBus, triggeredAutomations);
      assert.equal(manager.lastResult, 50);

      // Change the action value
      sprootDB.automations.actions.output.getActionsByOutputIdAsync.resolves([
        {
          id: 1,
          automationId: 1,
          outputId: 1,
          value: 75,
          precedence: "Normal",
        },
      ]);

      // Second call should see updated value
      await eventBus.publishAsync(new OutputActionsModifiedEvent({}));
      await new Promise((resolve) => setImmediate(resolve));
      await publishAutomationEventAsync(eventBus, triggeredAutomations);
      assert.equal(manager.lastResult, 75);
    });
  });

  describe("createInstanceAsync", () => {
    it("should create manager and load actions", async () => {
      const sprootDB = createStubSprootDB();
      const eventBus = new MemoryEventBus(mockLogger);

      sprootDB.automations.actions.output.getActionsByOutputIdAsync.resolves([
        {
          id: 1,
          automationId: 1,
          outputId: 1,
          value: 50,
          precedence: "Normal",
        },
        {
          id: 2,
          automationId: 2,
          outputId: 1,
          value: 75,
          precedence: "High",
        },
      ]);

      using manager = await OutputActionManager.createInstanceAsync(
        1,
        async () => {},
        eventBus,
        sprootDB.automations.actions.output,
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
        precedence: "Emergency",
      });

      assert.equal(action.id, 1);
      assert.equal(action.automationId, 1);
      assert.equal(action.outputId, 1);
      assert.equal(action.value, 75);
      assert.equal(action.precedence, "Emergency");
    });
  });
});
