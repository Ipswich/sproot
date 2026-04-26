import { assert } from "chai";
import { EventEmitter } from "events";
import { PassThrough, Readable } from "stream";
import { FrameBuffer } from "../FrameBuffer";
import StreamProxy from "../StreamProxy";
import { UpstreamConnection } from "../UpstreamConnection";
import sinon from "sinon";
import winston from "winston";
import { streamHandlerAsync } from "../../api/v2/camera/handlers/CameraHandlers";
import { DI_KEYS } from "../../utils/DependencyInjectionConstants";

const logger = winston.createLogger({
  silent: true,
});

describe("StreamProxy", () => {
  let streamProxy: StreamProxy;

  afterEach(async () => {
    if (streamProxy) {
      await streamProxy.stopAsync();
      streamProxy = undefined!;
    }
  });

  it("should create with default options", () => {
    streamProxy = new StreamProxy({
      logger,
      upstreamUrl: "http://localhost:3002",
      upstreamHeaders: () => ({ "X-Test": "test" }),
    });

    assert.isDefined(streamProxy);
  });

  it("should create frame buffer and upstream connection", () => {
    streamProxy = new StreamProxy({
      logger,
      upstreamUrl: "http://localhost:3002",
      upstreamHeaders: () => ({ "X-Test": "test" }),
    });

    const frameBuffer = streamProxy.getFrameBuffer();
    const upstream = streamProxy.getUpstreamConnection();

    assert.isDefined(frameBuffer);
    assert.isDefined(upstream);
  });

  it("should get status with upstream and buffer", async () => {
    streamProxy = new StreamProxy({
      logger,
      upstreamUrl: "http://localhost:3002",
      upstreamHeaders: () => ({ "X-Test": "test" }),
    });

    const status = streamProxy.getStatus();

    assert.isDefined(status.upstream);
    assert.isDefined(status.buffer);
    assert.isNumber(status.buffer.subscriberCount);
  });

  it("should have frame buffer", () => {
    streamProxy = new StreamProxy({
      logger,
      upstreamUrl: "http://localhost:3002",
      upstreamHeaders: () => ({ "X-Test": "test" }),
    });

    const frameBuffer = streamProxy.getFrameBuffer();
    assert.isDefined(frameBuffer);
  });
});

describe("FrameBuffer", () => {
  let frameBuffer: FrameBuffer;

  beforeEach(() => {
    frameBuffer = new FrameBuffer({
      logger,
    });
  });

  it("should start with no subscribers", () => {
    assert.equal(frameBuffer.getSubscriberCount(), 0);
  });

  it("should get pass-through stream", () => {
    const stream = frameBuffer.getStream();
    assert.isDefined(stream);
    assert.instanceOf(stream, PassThrough);
  });

  it("should add and remove subscribers", () => {
    const mockResponse = {
      statusCode: 200,
      headersSent: false,
      writableEnded: false,
      writable: true,
      write: () => true,
    } as any;

    const subscriber = {
      onChunk: (_chunk: Buffer) => {},
      onDestroy: () => {},
    };

    frameBuffer.addSubscriber(mockResponse, subscriber);
    assert.equal(frameBuffer.getSubscriberCount(), 1);

    frameBuffer.removeSubscriber(mockResponse);
    assert.equal(frameBuffer.getSubscriberCount(), 0);
  });

  it("should deliver chunks to subscribers", () => {
    const receivedChunks: Buffer[] = [];
    const mockResponse = {
      statusCode: 200,
      headersSent: false,
      writableEnded: false,
      writable: true,
      write: () => true,
    } as any;

    const subscriber = {
      onChunk: (chunk: Buffer) => receivedChunks.push(chunk),
      onDestroy: () => {},
    };

    frameBuffer.addSubscriber(mockResponse, subscriber);

    frameBuffer.getStream().write(Buffer.from("test data"));

    assert.equal(receivedChunks.length, 1);
    assert.equal(receivedChunks[0]?.toString(), "test data");
  });

  it("should handle multiple subscribers", () => {
    const receivedChunks1: Buffer[] = [];
    const receivedChunks2: Buffer[] = [];

    const mockResponse1 = {
      statusCode: 200,
      headersSent: false,
      writableEnded: false,
      writable: true,
      write: () => true,
    } as any;

    const mockResponse2 = {
      statusCode: 200,
      headersSent: false,
      writableEnded: false,
      writable: true,
      write: () => true,
    } as any;

    const subscriber1 = {
      onChunk: (chunk: Buffer) => receivedChunks1.push(chunk),
      onDestroy: () => {},
    };

    const subscriber2 = {
      onChunk: (chunk: Buffer) => receivedChunks2.push(chunk),
      onDestroy: () => {},
    };

    frameBuffer.addSubscriber(mockResponse1, subscriber1);
    frameBuffer.addSubscriber(mockResponse2, subscriber2);

    frameBuffer.getStream().write(Buffer.from("test data"));

    assert.equal(receivedChunks1.length, 1);
    assert.equal(receivedChunks2.length, 1);
    assert.equal(receivedChunks1[0]?.toString(), "test data");
    assert.equal(receivedChunks2[0]?.toString(), "test data");
  });

  it("should mark as healthy when subscribers exist", () => {
    assert.isFalse(frameBuffer.isHealthy());

    const mockResponse = {
      statusCode: 200,
      headersSent: false,
      writableEnded: false,
      writable: true,
      write: () => true,
    } as any;

    const subscriber = {
      onChunk: (_chunk: Buffer) => {},
      onDestroy: () => {},
    };

    frameBuffer.addSubscriber(mockResponse, subscriber);
    assert.isTrue(frameBuffer.isHealthy());
  });

  it("should remove subscribers that are no longer writable", () => {
    const onDestroy = sinon.spy();
    const mockResponse = {
      statusCode: 200,
      headersSent: true,
      writableEnded: false,
      writable: false,
      destroyed: true,
      write: () => true,
    } as any;

    const subscriber = {
      onChunk: (_chunk: Buffer) => {},
      onDestroy,
    };

    frameBuffer.addSubscriber(mockResponse, subscriber);

    frameBuffer.getStream().write(Buffer.from("test data"));

    assert.equal(frameBuffer.getSubscriberCount(), 0);
    assert.equal(onDestroy.callCount, 1);
  });

  it("should remove subscribers when chunk delivery throws", () => {
    const onDestroy = sinon.spy();
    const mockResponse = {
      statusCode: 200,
      headersSent: false,
      writableEnded: false,
      writable: true,
      destroyed: false,
      write: () => true,
    } as any;

    const subscriber = {
      onChunk: () => {
        throw new Error("write failed");
      },
      onDestroy,
    };

    frameBuffer.addSubscriber(mockResponse, subscriber);

    frameBuffer.getStream().write(Buffer.from("test data"));

    assert.equal(frameBuffer.getSubscriberCount(), 0);
    assert.equal(onDestroy.callCount, 1);
  });
});

describe("streamHandlerAsync", () => {
  let frameBuffer: FrameBuffer;
  let request: any;
  let response: any;

  beforeEach(() => {
    frameBuffer = new FrameBuffer({ logger });

    request = {
      originalUrl: "/api/v2/camera/stream",
      app: {
        get: (key: string) => {
          if (key === DI_KEYS.CameraManager) {
            return {
              getFrameBuffer: () => frameBuffer,
            };
          }

          if (key === DI_KEYS.Logger) {
            return logger;
          }

          return undefined;
        },
      },
    };

    response = Object.assign(new EventEmitter(), {
      headersSent: false,
      writableEnded: false,
      writable: true,
      destroyed: false,
      locals: {
        defaultProperties: {},
      },
      setHeader: sinon.stub(),
      removeHeader: sinon.stub(),
      write: sinon.stub().returns(true),
      end: sinon.stub().callsFake(() => {
        response.writableEnded = true;
        return response;
      }),
      status: sinon.stub().returnsThis(),
      json: sinon.stub().returnsThis(),
    });
  });

  it("should remove the shared stream error listener when the client disconnects", async () => {
    const stream = frameBuffer.getStream();
    const baselineErrorListeners = stream.listenerCount("error");

    await streamHandlerAsync(request, response);

    assert.equal(frameBuffer.getSubscriberCount(), 1);
    assert.equal(stream.listenerCount("error"), baselineErrorListeners + 1);

    response.emit("close");

    assert.equal(frameBuffer.getSubscriberCount(), 0);
    assert.equal(stream.listenerCount("error"), baselineErrorListeners);
  });

  it("should disconnect the client when response.write throws", async () => {
    const stream = frameBuffer.getStream();
    const baselineErrorListeners = stream.listenerCount("error");
    response.write = sinon.stub().throws(new Error("socket closed"));

    await streamHandlerAsync(request, response);
    stream.write(Buffer.from("test frame"));

    assert.equal(frameBuffer.getSubscriberCount(), 0);
    assert.equal(stream.listenerCount("error"), baselineErrorListeners);
    assert.equal(response.end.callCount, 1);
  });
});

describe("UpstreamConnection", () => {
  let frameBuffer: FrameBuffer;
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    frameBuffer = new FrameBuffer({
      logger,
    });
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    sinon.restore();
    clock.restore();
  });

  it("should create with default options", () => {
    const upstream = new UpstreamConnection({
      logger,
      url: "http://localhost:3002",
      headers: { "X-Test": "test" },
      frameBuffer,
    });

    assert.isDefined(upstream);
  });

  it("should get initial state as disconnected", () => {
    const upstream = new UpstreamConnection({
      logger,
      url: "http://localhost:3002",
      headers: { "X-Test": "test" },
      frameBuffer,
    });

    const state = upstream.getState();
    assert.equal(state.status, "disconnected");
  });

  it("should disconnect cleanly without starting timers", () => {
    const upstream = new UpstreamConnection({
      logger,
      url: "http://localhost:3002",
      headers: { "X-Test": "test" },
      frameBuffer,
    });

    // Just test that disconnect doesn't throw
    upstream.disconnect();

    // Should still be disconnected
    const state = upstream.getState();
    assert.equal(state.status, "disconnected");
  });

  it("should stay connected while upstream data continues to arrive", async () => {
    const upstreamStream = new PassThrough();
    const fetchStub = sinon.stub(globalThis, "fetch").resolves(
      new Response(Readable.toWeb(upstreamStream) as ReadableStream, {
        status: 200,
      }),
    );

    const upstream = new UpstreamConnection({
      logger,
      url: "http://localhost:3002",
      headers: { "X-Test": "test" },
      frameBuffer,
      healthCheckIntervalMs: 100,
      staleStreamThresholdMs: 250,
      initialReconnectDelayMs: 5000,
    });

    const connected = await upstream.connectAsync();

    assert.isTrue(connected);
    assert.equal(fetchStub.callCount, 1);

    upstreamStream.write(Buffer.from("frame-1"));
    await clock.tickAsync(150);
    upstreamStream.write(Buffer.from("frame-2"));
    await clock.tickAsync(150);
    upstreamStream.write(Buffer.from("frame-3"));
    await clock.tickAsync(150);

    const state = upstream.getState();
    assert.equal(state.status, "connected");

    upstream.disconnect();
    upstreamStream.destroy();
  });

  it("should disconnect and schedule reconnect when upstream data stalls", async () => {
    const upstreamStream = new PassThrough();
    const fetchStub = sinon.stub(globalThis, "fetch").resolves(
      new Response(Readable.toWeb(upstreamStream) as ReadableStream, {
        status: 200,
      }),
    );

    const upstream = new UpstreamConnection({
      logger,
      url: "http://localhost:3002",
      headers: { "X-Test": "test" },
      frameBuffer,
      healthCheckIntervalMs: 100,
      staleStreamThresholdMs: 250,
      initialReconnectDelayMs: 5000,
      maxReconnectDelayMs: 5000,
    });

    const connected = await upstream.connectAsync();

    assert.isTrue(connected);
    await clock.tickAsync(300);

    const state = upstream.getState();
    assert.equal(state.status, "disconnected");
    if (state.status === "disconnected") {
      assert.include(state.reason ?? "", "stream stalled");
    }
    assert.equal(fetchStub.callCount, 1);

    upstream.disconnect();
    upstreamStream.destroy();
  });
});
