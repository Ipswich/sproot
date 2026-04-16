import { assert } from "chai";
import { PassThrough } from "stream";
import { FrameBuffer } from "../FrameBuffer";
import StreamProxy from "../StreamProxy";
import winston from "winston";

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
});

describe("UpstreamConnection", () => {
  let frameBuffer: FrameBuffer;

  beforeEach(() => {
    frameBuffer = new FrameBuffer({
      logger,
    });
  });

  it("should create with default options", () => {
    const upstream = new (require("../UpstreamConnection").UpstreamConnection)({
      logger,
      url: "http://localhost:3002",
      headers: { "X-Test": "test" },
      frameBuffer,
    });

    assert.isDefined(upstream);
  });

  it("should get initial state as disconnected", () => {
    const upstream = new (require("../UpstreamConnection").UpstreamConnection)({
      logger,
      url: "http://localhost:3002",
      headers: { "X-Test": "test" },
      frameBuffer,
    });

    const state = upstream.getState();
    assert.equal(state.status, "disconnected");
  });

  it("should disconnect cleanly without starting timers", () => {
    const upstream = new (require("../UpstreamConnection").UpstreamConnection)({
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
});
