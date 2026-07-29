import { assert } from "chai";
import winston from "winston";
import { LogHistoryService } from "../LogHistoryService";
import { LiveLogTransport } from "../LiveLogTransport";
import { MemoryEventBus } from "../../eventbus/MemoryEventBus";
import { Events } from "../../eventbus/events/Events";
describe("LogHistoryService + LiveLogTransport integration", () => {
  let logger: winston.Logger;
  let eventBus: MemoryEventBus;
  let historyService: LogHistoryService;
  let transport: LiveLogTransport;

  beforeEach(() => {
    eventBus = new MemoryEventBus(winston.createLogger({ silent: true }));
    historyService = new LogHistoryService(50, eventBus);
    transport = new LiveLogTransport(eventBus, (eventBus as any).logger);
    logger = winston.createLogger({
      transports: [transport],
      level: "info",
    });
  });

  it("log entries flow from Winston logger through transport to history service", (done) => {
    (logger.info as any)("user logged in", { userId: 42, action: "login" });

    setTimeout(() => {
      const history = historyService.getHistory();
      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0]!.payload.message, "user logged in");
      assert.strictEqual(history[0]!.payload.level, "info");
      assert.deepEqual(history[0]!.payload.metadata, { userId: 42, action: "login" });
      done();
    }, 50);
  });

  it("event is published to event bus with correct type", (done) => {
    const receivedEvents: any[] = [];
    eventBus.subscribe(Events.LOG_EVENT, (event) => {
      receivedEvents.push(event);
    });

    logger.warn("test event bus publish");

    setTimeout(() => {
      assert.strictEqual(receivedEvents.length, 1);
      assert.strictEqual(receivedEvents[0].type, Events.LOG_EVENT);
      assert.strictEqual(receivedEvents[0].payload.message, "test event bus publish");
      done();
    }, 50);
  });

  it("history service receives events published by transport", (done) => {
    const receivedEvents: any[] = [];
    eventBus.subscribe(Events.LOG_EVENT, (event) => {
      receivedEvents.push(event);
    });

    logger.info("integration test message");

    setTimeout(() => {
      const history = historyService.getHistory();
      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0]!.payload.message, "integration test message");
      assert.strictEqual(receivedEvents.length, 1);
      assert.strictEqual(receivedEvents[0].payload.message, "integration test message");
      done();
    }, 50);
  });

  it("multiple log entries are all stored and published", async () => {
    const receivedEvents: any[] = [];
    eventBus.subscribe(Events.LOG_EVENT, (event) => {
      receivedEvents.push(event);
    });

    logger.info("first message");
    logger.warn("second message");
    logger.error("third message");

    await new Promise((resolve) => setTimeout(resolve, 50));

    const history = historyService.getHistory();
    assert.strictEqual(history.length, 3);
    assert.strictEqual(history[0]!.payload.message, "first message");
    assert.strictEqual(history[1]!.payload.message, "second message");
    assert.strictEqual(history[2]!.payload.message, "third message");
    assert.strictEqual(receivedEvents.length, 3);
  });
});
