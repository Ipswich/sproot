// server/src/api/v2/system/test/LogStreamHandler.spec.ts
import { assert } from "chai";
import sinon, { SinonStub } from "sinon";
import express, { Express } from "express";
import winston from "winston";
import { MemoryEventBus } from "../../../../eventbus/MemoryEventBus";
import { DI_KEYS } from "../../../../utils/DependencyInjectionConstants";
import { LogStreamService } from "../../../../system/LogStreamService";
import { LogEvent } from "../../../../eventbus/events/logging/LogEvent";
import { logStreamHandler } from "../LogStreamHandler";
import { EventEmitter } from "events";

describe("logStreamHandler", () => {
  let eventBus: MemoryEventBus;
  let logStreamService: LogStreamService;
  let logger: winston.Logger;
  let app: Express;
  let mockRes: any;

  function createMockResponse(): void {
    const ee: any = new EventEmitter();
    ee.write = sinon.stub();
    ee.setHeader = sinon.stub();
    ee.flushHeaders = sinon.stub();
    ee.writableEnded = false;
    mockRes = ee;
  }

  function createMockRequest(_app: Express): {
    app: { get: SinonStub };
  } {
    return {
      app: {
        get: (key: string) => {
          if (key === DI_KEYS.LogStreamService) return logStreamService;
          if (key === DI_KEYS.EventBus) return eventBus;
          return undefined;
        },
      },
    } as unknown as any;
  }

  beforeEach(() => {
    logger = winston.createLogger({ silent: true });
    eventBus = new MemoryEventBus(logger);
    logStreamService = new LogStreamService(200, eventBus, logger);
    app = express();
  });

  afterEach(() => {
    sinon.restore();
    // Clean up heartbeat interval and event bus subscription left by handler.
    // Tests that explicitly test disconnect (emit "close" themselves) will
    // have already cleaned up — emitting "close" again is a no-op.
    mockRes?.emit("close");
  });

  it("sends SSE headers", () => {
    createMockResponse();
    const req = createMockRequest(app);

    logStreamHandler(req as any, mockRes);

    assert.isTrue(
      (mockRes.setHeader as sinon.SinonStub).calledWith(
        "Content-Type",
        "text/event-stream; charset=utf-8",
      ),
    );
    assert.isTrue((mockRes.setHeader as sinon.SinonStub).calledWith("Cache-Control", "no-cache"));
    assert.isTrue((mockRes.setHeader as sinon.SinonStub).calledWith("Connection", "keep-alive"));
    assert.isTrue((mockRes.setHeader as sinon.SinonStub).calledWith("X-Accel-Buffering", "no"));
    assert.isTrue(mockRes.flushHeaders.calledOnce);
  });

  it("sends history events as SSE data frames", () => {
    createMockResponse();
    const req = createMockRequest(app);

    const event1 = new LogEvent({
      timestamp: "2024-01-01T00:00:00.000Z",
      level: "info",
      message: "first",
    });
    const event2 = new LogEvent({
      timestamp: "2024-01-01T00:00:01.000Z",
      level: "warn",
      message: "second",
    });

    logStreamService.publish(event1 as any);
    logStreamService.publish(event2 as any);

    logStreamHandler(req as any, mockRes);

    const writeCalls = (mockRes.write as sinon.SinonStub).args.map((a: any) => a[0]);
    assert.isAtLeast(writeCalls.length, 2);

    const firstData = JSON.parse(writeCalls[0]!.replace(/^data: /, ""));
    assert.strictEqual(firstData.message, "first");
    assert.strictEqual(firstData.level, "info");

    const secondData = JSON.parse(writeCalls[1]!.replace(/^data: /, ""));
    assert.strictEqual(secondData.message, "second");
    assert.strictEqual(secondData.level, "warn");
  });

  it("sends no data frames when history is empty", () => {
    createMockResponse();
    const req = createMockRequest(app);

    logStreamHandler(req as any, mockRes);

    assert.isFalse((mockRes.write as sinon.SinonStub).called);
  });

  it("streams new log events via event bus subscription", async () => {
    createMockResponse();
    const req = createMockRequest(app);

    logStreamHandler(req as any, mockRes);

    const newEvent = new LogEvent({
      timestamp: "2024-01-01T00:00:02.000Z",
      level: "error",
      message: "streaming test",
    });

    // Publish via event bus (mimics what LiveLogTransport does)
    await eventBus.publishAsync(newEvent as any);

    const writeCalls = (mockRes.write as sinon.SinonStub).args.map((a: any) => a[0]);
    const streamingData = writeCalls.find((w: string) => w.includes("streaming test"));
    assert.isDefined(streamingData);
    assert.strictEqual(JSON.parse(streamingData!.replace(/^data: /, "")).level, "error");
  });

  it("deduplicates events that appear in both history and live stream", async () => {
    const eventId = "dedup-test-id";
    const event = new LogEvent(
      { timestamp: "2024-01-01T00:00:00.000Z", level: "info", message: "dedup test" },
      eventId,
    );

    logStreamService.publish(event as any);

    createMockResponse();
    const req = createMockRequest(app);

    logStreamHandler(req as any, mockRes);

    // Clear history writes so we only count live stream writes
    (mockRes.write as sinon.SinonStub).resetHistory();

    // Publish the same event again via event bus (same eventId)
    await eventBus.publishAsync(event as any);

    const writeCalls = (mockRes.write as sinon.SinonStub).args.map((a: any) => a[0]);
    const dedupCount = writeCalls.filter((w: string) => w.includes("dedup test")).length;
    assert.strictEqual(
      dedupCount,
      0,
      "Event with same eventId should not appear again in live stream",
    );
  });

  it("unsubscribes from event bus on disconnect", async () => {
    createMockResponse();
    const req = createMockRequest(app);

    logStreamHandler(req as any, mockRes);

    // Emit close to trigger cleanup
    mockRes.emit("close");

    // After close, the event bus should have no more subscribers for LOG_EVENT
    // We verify by publishing an event and confirming nothing is written
    (mockRes.write as sinon.SinonStub).resetHistory();
    const testEvent = new LogEvent({
      timestamp: "2024-01-01T00:00:00.000Z",
      level: "info",
      message: "after-close",
    });
    await eventBus.publishAsync(testEvent as any);
    assert.isFalse(
      (mockRes.write as sinon.SinonStub).called,
      "No writes should occur after unsubscribe",
    );
  });

  it("stops heartbeat timer on disconnect", () => {
    const clearIntervalStub = sinon.stub(global, "clearInterval");
    const setIntervalStub = sinon.stub(global, "setInterval").returns(42 as never);

    createMockResponse();
    const req = createMockRequest(app);

    logStreamHandler(req as any, mockRes);

    assert.isTrue(setIntervalStub.calledOnce, "setInterval should be called once for heartbeat");

    mockRes.emit("close");

    assert.isTrue(
      clearIntervalStub.calledWith(42),
      "clearInterval should be called with the heartbeat interval ID on disconnect",
    );
  });

  it("does not write after response is ended", () => {
    createMockResponse();
    mockRes.writableEnded = true;
    const req = createMockRequest(app);

    logStreamHandler(req as any, mockRes);

    // Headers should still be set, but no writes should occur
    assert.isTrue(mockRes.flushHeaders.calledOnce);
    assert.isFalse((mockRes.write as sinon.SinonStub).called);
  });
});
