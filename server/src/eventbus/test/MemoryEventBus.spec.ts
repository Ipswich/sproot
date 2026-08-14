import { assert } from "chai";
import sinon from "sinon";
import winston from "winston";
import { MemoryEventBus } from "../MemoryEventBus";
import { Events } from "../events/Events";
import { AutomationsTriggeredEvent } from "../events/automations/AutomationsTriggeredEvent";
import { NotificationActionUpdatedEvent } from "../events/actions/NotificationActionEvents";
import { OutputActionUpdatedEvent } from "../events/actions/OutputActionEvents";

describe("MemoryEventBus", () => {
  let logger: winston.Logger;
  let eventBus: MemoryEventBus;

  beforeEach(() => {
    logger = winston.createLogger({ silent: true });
    eventBus = new MemoryEventBus(logger);
  });

  it("publishes to every subscriber for the matching event type", async () => {
    const firstHandler = sinon.stub().resolves();
    const secondHandler = sinon.stub().resolves();
    const event = new AutomationsTriggeredEvent(
      new Map([
        [
          1,
          {
            automationId: 1,
            automationName: "Grow Lights",
            operator: "or",
            conditions: { allOf: [], anyOf: [], oneOf: [] },
          },
        ],
      ]),
    );

    eventBus.subscribe(Events.AUTOMATIONS_TRIGGERED_EVENT, firstHandler);
    eventBus.subscribe(Events.AUTOMATIONS_TRIGGERED_EVENT, secondHandler);

    await eventBus.publishAsync(event);

    assert.isTrue(firstHandler.calledOnceWithExactly(event));
    assert.isTrue(secondHandler.calledOnceWithExactly(event));
  });

  it("does not invoke subscribers registered for a different event type", async () => {
    const outputHandler = sinon.stub().resolves();
    const notificationHandler = sinon.stub().resolves();

    eventBus.subscribe(Events.OUTPUT_ACTION_UPDATED_EVENT, outputHandler);
    eventBus.subscribe(Events.NOTIFICATION_ACTION_UPDATED_EVENT, notificationHandler);

    await eventBus.publishAsync(
      new OutputActionUpdatedEvent({
        action: { id: 1, automationId: 1, outputId: 1, value: 10, precedence: "Normal" },
      }),
    );

    assert.isTrue(outputHandler.calledOnce);
    assert.isTrue(notificationHandler.notCalled);
  });

  it("resolves immediately when no subscribers exist", async () => {
    await eventBus.publishAsync(
      new OutputActionUpdatedEvent({
        action: { id: 1, automationId: 1, outputId: 1, value: 10, precedence: "Normal" },
      }),
    );
  });

  it("waits for asynchronous handlers before resolving publishAsync", async () => {
    let resolveHandler: (() => void) | undefined;
    const completedHandlers: string[] = [];

    eventBus.subscribe(Events.OUTPUT_ACTION_UPDATED_EVENT, async () => {
      await new Promise<void>((resolve) => {
        resolveHandler = resolve;
      });
      completedHandlers.push("slow");
    });

    eventBus.subscribe(Events.OUTPUT_ACTION_UPDATED_EVENT, async () => {
      completedHandlers.push("fast");
    });

    const publishPromise = eventBus.publishAsync(
      new OutputActionUpdatedEvent({
        action: { id: 1, automationId: 1, outputId: 1, value: 10, precedence: "Normal" },
      }),
    );
    await Promise.resolve();

    assert.deepEqual(completedHandlers, ["fast"]);

    resolveHandler!();
    await publishPromise;

    assert.sameMembers(completedHandlers, ["fast", "slow"]);
  });

  it("supports unsubscribing handlers and leaves remaining handlers active", async () => {
    const retainedHandler = sinon.stub().resolves();
    const removedHandler = sinon.stub().resolves();

    const unsubscribe = eventBus.subscribe(Events.OUTPUT_ACTION_UPDATED_EVENT, removedHandler);
    eventBus.subscribe(Events.OUTPUT_ACTION_UPDATED_EVENT, retainedHandler);

    unsubscribe();
    unsubscribe();

    await eventBus.publishAsync(
      new OutputActionUpdatedEvent({
        action: { id: 1, automationId: 1, outputId: 1, value: 10, precedence: "Normal" },
      }),
    );

    assert.isTrue(removedHandler.notCalled);
    assert.isTrue(retainedHandler.calledOnce);
  });

  it("allows a handler to unsubscribe itself without breaking the current dispatch", async () => {
    const persistentHandler = sinon.stub().resolves();
    let unsubscribe: (() => void) | undefined;
    const selfRemovingHandler = sinon.stub().callsFake(() => {
      unsubscribe!();
    });

    unsubscribe = eventBus.subscribe(Events.OUTPUT_ACTION_UPDATED_EVENT, selfRemovingHandler);
    eventBus.subscribe(Events.OUTPUT_ACTION_UPDATED_EVENT, persistentHandler);

    await eventBus.publishAsync(
      new OutputActionUpdatedEvent({
        action: { id: 1, automationId: 1, outputId: 1, value: 10, precedence: "Normal" },
      }),
    );
    await eventBus.publishAsync(
      new OutputActionUpdatedEvent({
        action: { id: 1, automationId: 1, outputId: 1, value: 10, precedence: "Normal" },
      }),
    );

    assert.isTrue(selfRemovingHandler.calledOnce);
    assert.isTrue(persistentHandler.calledTwice);
  });

  it("logs handler failures and continues dispatching sibling handlers", async () => {
    const errorStub = sinon.stub(logger, "error");
    const successfulHandler = sinon.stub().resolves();
    const failure = new Error("boom");

    eventBus.subscribe(Events.NOTIFICATION_ACTION_UPDATED_EVENT, async () => {
      throw failure;
    });
    eventBus.subscribe(Events.NOTIFICATION_ACTION_UPDATED_EVENT, successfulHandler);

    await eventBus.publishAsync(
      new NotificationActionUpdatedEvent({
        action: { id: 1, automationId: 1, subject: "s", content: "c" },
      }),
    );

    assert.isTrue(successfulHandler.calledOnce);
    assert.isTrue(errorStub.calledOnce);
    assert.include(String(errorStub.firstCall.args[0]), Events.NOTIFICATION_ACTION_UPDATED_EVENT);
    assert.include(String(errorStub.firstCall.args[0]), "boom");
  });

  it("does not notify handlers subscribed after an earlier publish", async () => {
    const lateSubscriber = sinon.stub().resolves();

    await eventBus.publishAsync(
      new OutputActionUpdatedEvent({
        action: { id: 1, automationId: 1, outputId: 1, value: 10, precedence: "Normal" },
      }),
    );
    eventBus.subscribe(Events.OUTPUT_ACTION_UPDATED_EVENT, lateSubscriber);
    await eventBus.publishAsync(
      new OutputActionUpdatedEvent({
        action: { id: 1, automationId: 1, outputId: 1, value: 10, precedence: "Normal" },
      }),
    );

    assert.isTrue(lateSubscriber.calledOnce);
  });
});
