import { assert } from "chai";
import sinon from "sinon";
import winston from "winston";
import { LiveLogTransport } from "../LiveLogTransport";
import { IEventBus } from "../../eventbus/IEventBus";
import { Events } from "../../eventbus/events/Events";

describe("LiveLogTransport", () => {
  let eventBusMock: sinon.SinonStubbedInstance<IEventBus>;
  let logger: winston.Logger;
  let transport: LiveLogTransport;

  beforeEach(() => {
    eventBusMock = {
      publishAsync: sinon.stub().resolves(),
      subscribe: sinon.stub().returns(() => {}),
    } as unknown as sinon.SinonStubbedInstance<IEventBus>;
    logger = winston.createLogger({ silent: true });
    transport = new LiveLogTransport(eventBusMock, logger);
  });

  function getPublishedEvent(): any {
    return eventBusMock.publishAsync.firstCall.args[0];
  }

  it("publishes one event per Winston log call", (done) => {
    const info = {
      level: "info",
      message: "test message",
      timestamp: "2024-01-15T10:30:00.000Z",
    };

    transport.log(info, () => {
      assert.isTrue(eventBusMock.publishAsync.calledOnce);
      const event = getPublishedEvent();
      assert.strictEqual(event.type, Events.LOG_EVENT);
      assert.strictEqual(event.payload.message, "test message");
      done();
    });
  });

  it("preserves timestamp from Winston info", (done) => {
    const info = {
      level: "warn",
      message: "warning message",
      timestamp: "2024-06-01T12:00:00.000Z",
    };

    transport.log(info, () => {
      const event = getPublishedEvent();
      assert.strictEqual(event.payload.timestamp, "2024-06-01T12:00:00.000Z");
      done();
    });
  });

  it("preserves level from Winston info", (done) => {
    const info = {
      level: "error",
      message: "error message",
      timestamp: "2024-01-15T10:30:00.000Z",
    };

    transport.log(info, () => {
      const event = getPublishedEvent();
      assert.strictEqual(event.payload.level, "error");
      done();
    });
  });

  it("preserves message from Winston info", (done) => {
    const info = {
      level: "debug",
      message: "debug message with %s and %d args",
      timestamp: "2024-01-15T10:30:00.000Z",
    };

    transport.log(info, () => {
      const event = getPublishedEvent();
      assert.strictEqual(event.payload.message, "debug message with %s and %d args");
      done();
    });
  });

  it("captures non-reserved keys as metadata", (done) => {
    const info = {
      level: "info",
      message: "user logged in",
      timestamp: "2024-01-15T10:30:00.000Z",
      userId: 42,
      ip: "192.168.1.1",
      session: "abc123",
    };

    transport.log(info, () => {
      const event = getPublishedEvent();
      assert.deepEqual(event.payload.metadata, {
        userId: 42,
        ip: "192.168.1.1",
        session: "abc123",
      });
      done();
    });
  });

  it("excludes reserved Winston keys from metadata", (done) => {
    const info = {
      level: "info",
      message: "test",
      timestamp: "2024-01-15T10:30:00.000Z",
      label: "my-label",
      splat: ["arg1"],
      stack: "Error: boom\n  at ...",
      levelLabel: "INFO",
      colorize: true,
      context: "test-context",
      customKey: "should-appear",
    };

    transport.log(info, () => {
      const event = getPublishedEvent();
      assert.deepEqual(event.payload.metadata, {
        customKey: "should-appear",
      });
      done();
    });
  });

  it("omits metadata field when no non-reserved keys present", (done) => {
    const info = {
      level: "info",
      message: "test",
      timestamp: "2024-01-15T10:30:00.000Z",
    };

    transport.log(info, () => {
      const event = getPublishedEvent();
      assert.isUndefined(event.payload.metadata);
      done();
    });
  });

  it("never throws when event bus publish throws", (done) => {
    eventBusMock.publishAsync.rejects(new Error("bus error"));
    const info = { level: "info", message: "test", timestamp: "now" };

    transport.log(info, () => {
      assert.isTrue(eventBusMock.publishAsync.calledOnce);
      done();
    });
  });

  it("always invokes callback even on error", (done) => {
    eventBusMock.publishAsync.rejects(new Error("bus error"));
    const info = { level: "info", message: "test", timestamp: "now" };
    let callbackInvoked = false;

    transport.log(info, () => {
      callbackInvoked = true;
    });

    // Small delay to let the transport process
    setTimeout(() => {
      assert.isTrue(callbackInvoked, "Callback should always be invoked");
      done();
    }, 50);
  });

  it("publishes event with correct type to event bus", (done) => {
    const info = {
      level: "info",
      message: "test",
      timestamp: "2024-01-15T10:30:00.000Z",
    };

    transport.log(info, () => {
      assert.isTrue(eventBusMock.publishAsync.calledOnce);
      const publishedEvent = getPublishedEvent();
      assert.strictEqual(publishedEvent.type, Events.LOG_EVENT);
      done();
    });
  });
});
