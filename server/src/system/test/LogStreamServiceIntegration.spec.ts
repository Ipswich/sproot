import { assert } from "chai";
import winston from "winston";
import { LogStreamService } from "../LogStreamService";
import { LiveLogTransport } from "../LiveLogTransport";
import { MemoryEventBus } from "../../eventbus/MemoryEventBus";
import { Events } from "../../eventbus/events/Events";

describe("LogStreamService + LiveLogTransport integration", () => {
  let logger: winston.Logger;
  let eventBus: MemoryEventBus;
  let service: LogStreamService;
  let transport: LiveLogTransport;

  beforeEach(() => {
    eventBus = new MemoryEventBus(winston.createLogger({ silent: true }));
    service = new LogStreamService(50, eventBus, (eventBus as any).logger);
    transport = new LiveLogTransport(service, (eventBus as any).logger);
    logger = winston.createLogger({
      transports: [transport],
      level: "info",
    });
  });

  it("log entries flow from Winston logger through transport to service history", (done) => {
    (logger.info as any)("user logged in", { userId: 42, action: "login" });

    setTimeout(() => {
      const history = service.getHistory();
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
});
