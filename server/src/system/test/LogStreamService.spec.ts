import { assert } from "chai";
import sinon from "sinon";
import winston from "winston";
import { LogStreamService } from "../LogStreamService";
import { LogEvent } from "../../eventbus/events/logging/LogEvent";
import { IEventBus } from "../../eventbus/IEventBus";
import { MemoryEventBus } from "../../eventbus/MemoryEventBus";

describe("LogStreamService", () => {
  let eventBusMock: sinon.SinonStubbedInstance<IEventBus>;
  let logger: winston.Logger;
  let service: LogStreamService;

  beforeEach(() => {
    eventBusMock = {
      publishAsync: sinon.stub().resolves(),
      subscribe: sinon.stub().returns(() => {}),
    } as unknown as sinon.SinonStubbedInstance<IEventBus>;
    logger = winston.createLogger({ silent: true });
    service = new LogStreamService(5, eventBusMock, logger);
  });

  it("stores entries in history", () => {
    const event = new LogEvent({
      timestamp: "2024-01-15T10:30:00.000Z",
      level: "info",
      message: "test message",
    });

    service.publish(event as any);
    const history = service.getHistory();

    assert.strictEqual(history.length, 1);
    assert.strictEqual(history[0]!.payload.message, "test message");
    assert.strictEqual(history[0]!.payload.level, "info");
    assert.strictEqual(history[0]!.payload.timestamp, "2024-01-15T10:30:00.000Z");
  });

  it("evicts oldest entries when buffer is full", () => {
    const events = [
      new LogEvent({ timestamp: "t1", level: "info", message: "first" }),
      new LogEvent({ timestamp: "t2", level: "info", message: "second" }),
      new LogEvent({ timestamp: "t3", level: "info", message: "third" }),
      new LogEvent({ timestamp: "t4", level: "info", message: "fourth" }),
      new LogEvent({ timestamp: "t5", level: "info", message: "fifth" }),
      new LogEvent({ timestamp: "t6", level: "info", message: "sixth" }),
    ];

    for (const event of events) {
      service.publish(event as any);
    }

    const history = service.getHistory();
    assert.strictEqual(history.length, 5); // buffer size is 5
    assert.strictEqual(history[0]!.payload.message, "second");
    assert.strictEqual(history[4]!.payload.message, "sixth");
  });

  it("preserves ordering (oldest to newest)", () => {
    const events = [
      new LogEvent({ timestamp: "1", level: "info", message: "one" }),
      new LogEvent({ timestamp: "2", level: "info", message: "two" }),
      new LogEvent({ timestamp: "3", level: "info", message: "three" }),
    ];

    for (const event of events) {
      service.publish(event as any);
    }

    const history = service.getHistory();
    assert.strictEqual(history[0]!.payload.message, "one");
    assert.strictEqual(history[1]!.payload.message, "two");
    assert.strictEqual(history[2]!.payload.message, "three");
  });

  it("publishes to event bus", () => {
    const event = new LogEvent({
      timestamp: "2024-01-15T10:30:00.000Z",
      level: "info",
      message: "test",
    });

    service.publish(event as any);

    assert.isTrue(eventBusMock.publishAsync.calledOnce);
    assert.strictEqual(
      (eventBusMock.publishAsync.firstCall.args[0] as LogEvent).eventId,
      event.eventId,
    );
  });

  it("returns a new array on each call (caller cannot mutate buffer)", () => {
    const event = new LogEvent({
      timestamp: "2024-01-15T10:30:00.000Z",
      level: "info",
      message: "test",
    });

    service.publish(event as any);
    const history = service.getHistory();

    // Mutate the returned array
    history.length = 0;

    // Next call returns a fresh array with the original data
    const history2 = service.getHistory();
    assert.strictEqual(history2.length, 1);
    assert.notStrictEqual(history, history2, "Each call returns a new array");
  });

  it("returns empty array when no events have been published", () => {
    const history = service.getHistory();
    assert.strictEqual(history.length, 0);
    assert.isArray(history);
  });

  it("uses default history size of 200 when undefined is passed", () => {
    const defaultBus = new MemoryEventBus(winston.createLogger({ silent: true }));
    const defaultService = new LogStreamService(undefined, defaultBus, (defaultBus as any).logger);

    for (let i = 0; i < 150; i++) {
      defaultService.publish(new LogEvent({
        timestamp: `t${i}`,
        level: "info",
        message: `message ${i}`,
      }) as any);
    }

    const history = defaultService.getHistory();
    assert.strictEqual(history.length, 150);

    // Push 60 more to reach 210 (exceeds 200 default)
    for (let i = 150; i < 210; i++) {
      defaultService.publish(new LogEvent({
        timestamp: `t${i}`,
        level: "info",
        message: `message ${i}`,
      }) as any);
    }

    const history2 = defaultService.getHistory();
    assert.strictEqual(history2.length, 200); // capped at default size
    assert.strictEqual(history2[0]!.payload.message, "message 10"); // oldest evicted
    assert.strictEqual(history2[199]!.payload.message, "message 209"); // newest
  });

  it("preserves eventId on stored events", () => {
    const eventId = "test-event-id-123";
    const event = new LogEvent(
      { timestamp: "2024-01-15T10:30:00.000Z", level: "info", message: "id test" },
      eventId,
    );

    service.publish(event as any);
    const history = service.getHistory();

    assert.strictEqual(history[0]!.eventId, eventId);
  });
});
