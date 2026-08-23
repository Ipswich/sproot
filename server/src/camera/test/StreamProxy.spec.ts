import { assert } from "chai";
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

  it("should disconnect upstream state when startup fails", async () => {
    const connectAsyncStub = sinon
      .stub(UpstreamConnection.prototype, "connectAsync")
      .resolves(false);

    streamProxy = new StreamProxy({
      logger,
      upstreamUrl: "http://localhost:3002",
      upstreamHeaders: () => ({ "X-Test": "test" }),
    });

    assert.isFalse(await streamProxy.startAsync());
    assert.isTrue(connectAsyncStub.calledOnce);
    assert.equal(streamProxy.getUpstreamConnection().getState().status, "disconnected");
    connectAsyncStub.restore();
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
  let request: any;
  let response: any;
  let cameraManager: { fetchStreamAsync: sinon.SinonStub };
  let upstreamStream: PassThrough;
  let bodyCancelSpy: sinon.SinonSpy;

  beforeEach(() => {
    upstreamStream = new PassThrough();
    bodyCancelSpy = sinon.spy(async () => undefined);
    cameraManager = {
      fetchStreamAsync: sinon.stub().resolves({
        ok: true,
        status: 200,
        headers: new Headers({
          "content-type": "multipart/x-mixed-replace; boundary=FRAME",
          "cache-control": "no-store",
        }),
        body: Object.assign(Readable.toWeb(upstreamStream), {
          cancel: bodyCancelSpy,
        }),
      }),
    };

    request = {
      originalUrl: "/api/v2/camera/1/stream",
      params: { cameraId: "1" },
      app: {
        get: (key: string) => {
          if (key === DI_KEYS.CameraManager) {
            return cameraManager;
          }

          if (key === DI_KEYS.Logger) {
            return logger;
          }

          return undefined;
        },
      },
    };

    response = new PassThrough() as any;
    response.headersSent = false;
    response.locals = {
      defaultProperties: {},
    };
    response.setHeader = sinon.stub();
    response.status = sinon.stub().returnsThis();
    response.json = sinon.stub().returnsThis();
    sinon.spy(response, "destroy");
  });

  it("should forward upstream headers and cancel the upstream body when the client disconnects", async () => {
    const receivedChunks: Buffer[] = [];
    response.on("data", (chunk: Buffer) => receivedChunks.push(chunk));

    await streamHandlerAsync(request, response);
    upstreamStream.write(Buffer.from("test frame"));
    await new Promise((resolve) => setImmediate(resolve));

    assert.isTrue(cameraManager.fetchStreamAsync.calledOnceWithExactly(1));
    assert.isTrue(
      response.setHeader.calledWith("Content-Type", "multipart/x-mixed-replace; boundary=FRAME"),
    );
    assert.isTrue(response.setHeader.calledWith("Cache-Control", "no-store"));
    assert.equal(Buffer.concat(receivedChunks).toString(), "test frame");

    response.emit("close");

    assert.isTrue(bodyCancelSpy.calledOnce);
  });

  it("should return 502 when the upstream stream is unavailable", async () => {
    cameraManager.fetchStreamAsync.resolves(null);

    await streamHandlerAsync(request, response);

    assert.isTrue(response.status.calledOnceWithExactly(502));
    assert.isTrue(response.json.calledOnce);
  });

  it("should return 400 for an invalid camera id", async () => {
    request.params = { cameraId: "invalid" };

    await streamHandlerAsync(request, response);

    assert.isTrue(response.status.calledOnceWithExactly(400));
    assert.isTrue(response.json.calledOnce);
  });

  it("should return 502 when fetching the upstream stream throws", async () => {
    cameraManager.fetchStreamAsync.rejects(new Error("upstream failed"));

    await streamHandlerAsync(request, response);

    assert.isTrue(response.status.calledOnceWithExactly(502));
    assert.isTrue(response.json.calledOnce);
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
      headers: () => ({ "X-Test": "test" }),
      frameBuffer,
    });

    assert.isDefined(upstream);
  });

  it("should get initial state as disconnected", () => {
    const upstream = new UpstreamConnection({
      logger,
      url: "http://localhost:3002",
      headers: () => ({ "X-Test": "test" }),
      frameBuffer,
    });

    const state = upstream.getState();
    assert.equal(state.status, "disconnected");
  });

  it("should disconnect cleanly without starting timers", () => {
    const upstream = new UpstreamConnection({
      logger,
      url: "http://localhost:3002",
      headers: () => ({ "X-Test": "test" }),
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
      headers: () => ({ "X-Test": "test" }),
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
    fetchStub.restore();
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
      headers: () => ({ "X-Test": "test" }),
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
    fetchStub.restore();
  });

  it("should regenerate headers for each new upstream connection", async () => {
    const firstUpstreamStream = new PassThrough();
    const secondUpstreamStream = new PassThrough();
    const headersFactory = sinon
      .stub<[], Record<string, string>>()
      .onFirstCall()
      .returns({ "X-Test": "first" })
      .onSecondCall()
      .returns({ "X-Test": "second" });

    const fetchStub = sinon.stub(globalThis, "fetch");
    fetchStub.onFirstCall().resolves(
      new Response(Readable.toWeb(firstUpstreamStream) as ReadableStream, {
        status: 200,
      }),
    );
    fetchStub.onSecondCall().resolves(
      new Response(Readable.toWeb(secondUpstreamStream) as ReadableStream, {
        status: 200,
      }),
    );

    const upstream = new UpstreamConnection({
      logger,
      url: "http://localhost:3002",
      headers: headersFactory,
      frameBuffer,
    });

    assert.isTrue(await upstream.connectAsync());
    upstream.disconnect();
    assert.isTrue(await upstream.connectAsync());

    assert.equal(headersFactory.callCount, 2);
    assert.deepEqual(fetchStub.firstCall.args[1]?.headers, { "X-Test": "first" });
    assert.deepEqual(fetchStub.secondCall.args[1]?.headers, { "X-Test": "second" });

    upstream.disconnect();
    firstUpstreamStream.destroy();
    secondUpstreamStream.destroy();
    fetchStub.restore();
  });
});
