import { assert } from "chai";
import winston from "winston";
import { LogHistoryService } from "../LogHistoryService";
import { LogEvent } from "../../eventbus/events/logging/LogEvent";
import { MemoryEventBus } from "../../eventbus/MemoryEventBus";

describe("LogHistoryService", () => {
  let eventBus: MemoryEventBus;
  let service: LogHistoryService;

  beforeEach(() => {
    eventBus = new MemoryEventBus(winston.createLogger({ silent: true }));
    service = new LogHistoryService(5, eventBus);
  });

  it("stores entries in history via event bus", async () => {
    const event = new LogEvent({
      timestamp: "2024-01-15T10:30:00.000Z",
      level: "info",
      message: "test message",
    });

    await eventBus.publishAsync(event as any);
    const history = service.getHistory();

    assert.strictEqual(history.length, 1);
    assert.strictEqual(history[0]!.payload.message, "test message");
    assert.strictEqual(history[0]!.payload.level, "info");
    assert.strictEqual(history[0]!.payload.timestamp, "2024-01-15T10:30:00.000Z");
  });

  it("evicts oldest entries when buffer is full", async () => {
    const events = [
      new LogEvent({ timestamp: "t1", level: "info", message: "first" }),
      new LogEvent({ timestamp: "t2", level: "info", message: "second" }),
      new LogEvent({ timestamp: "t3", level: "info", message: "third" }),
      new LogEvent({ timestamp: "t4", level: "info", message: "fourth" }),
      new LogEvent({ timestamp: "t5", level: "info", message: "fifth" }),
      new LogEvent({ timestamp: "t6", level: "info", message: "sixth" }),
    ];

    for (const event of events) {
      await eventBus.publishAsync(event as any);
    }

    const history = service.getHistory();
    assert.strictEqual(history.length, 5); // buffer size is 5
    assert.strictEqual(history[0]!.payload.message, "second");
    assert.strictEqual(history[4]!.payload.message, "sixth");
  });

  it("preserves ordering (oldest to newest)", async () => {
    const events = [
      new LogEvent({ timestamp: "1", level: "info", message: "one" }),
      new LogEvent({ timestamp: "2", level: "info", message: "two" }),
      new LogEvent({ timestamp: "3", level: "info", message: "three" }),
    ];

    for (const event of events) {
      await eventBus.publishAsync(event as any);
    }

    const history = service.getHistory();
    assert.strictEqual(history[0]!.payload.message, "one");
    assert.strictEqual(history[1]!.payload.message, "two");
    assert.strictEqual(history[2]!.payload.message, "three");
  });

  it("returns a new array on each call (caller cannot mutate buffer)", async () => {
    const event = new LogEvent({
      timestamp: "2024-01-15T10:30:00.000Z",
      level: "info",
      message: "test",
    });

    await eventBus.publishAsync(event as any);
    const history = service.getHistory();

    // Mutate the returned array
    history.length = 0;

    // Next call returns a fresh array with the original data
    const history2 = service.getHistory();
    assert.strictEqual(history2.length, 1);
    assert.notStrictEqual(history, history2, "Each call returns a new array");
  });

  it("returns empty array when no events have been stored", () => {
    const history = service.getHistory();
    assert.strictEqual(history.length, 0);
    assert.isArray(history);
  });

  it("uses default history size of 200 when undefined is passed", async () => {
    const defaultEventBus = new MemoryEventBus(winston.createLogger({ silent: true }));
    const defaultService = new LogHistoryService(undefined, defaultEventBus);

    for (let i = 0; i < 150; i++) {
      await defaultEventBus.publishAsync(
        new LogEvent({
          timestamp: `t${i}`,
          level: "info",
          message: `message ${i}`,
        }) as any,
      );
    }

    const history = defaultService.getHistory();
    assert.strictEqual(history.length, 150);

    // Push 60 more to reach 210 (exceeds 200 default)
    for (let i = 150; i < 210; i++) {
      await defaultEventBus.publishAsync(
        new LogEvent({
          timestamp: `t${i}`,
          level: "info",
          message: `message ${i}`,
        }) as any,
      );
    }

    const history2 = defaultService.getHistory();
    assert.strictEqual(history2.length, 200); // capped at default size
    assert.strictEqual(history2[0]!.payload.message, "message 10"); // oldest evicted
    assert.strictEqual(history2[199]!.payload.message, "message 209"); // newest
  });

  it("preserves eventId on stored events", async () => {
    const eventId = "test-event-id-123";
    const event = new LogEvent(
      { timestamp: "2024-01-15T10:30:00.000Z", level: "info", message: "id test" },
      eventId,
    );

    await eventBus.publishAsync(event as any);
    const history = service.getHistory();

    assert.strictEqual(history[0]!.eventId, eventId);
  });

  it("works with MemoryEventBus logger", async () => {
    const eventBus2 = new MemoryEventBus(winston.createLogger({ silent: true }));
    const serviceWithBusLogger = new LogHistoryService(10, eventBus2);

    for (let i = 0; i < 5; i++) {
      await eventBus2.publishAsync(
        new LogEvent({
          timestamp: `t${i}`,
          level: "info",
          message: `message ${i}`,
        }) as any,
      );
    }

    const history = serviceWithBusLogger.getHistory();
    assert.strictEqual(history.length, 5);
  });

  it("unsubscribes when disposed", () => {
    const eventBus2 = new MemoryEventBus(winston.createLogger({ silent: true }));
    const service2 = new LogHistoryService(10, eventBus2);

    service2[Symbol.dispose]();

    const history = service2.getHistory();
    assert.strictEqual(history.length, 0);
  });
});
