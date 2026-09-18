import { describe, it, beforeEach, afterEach } from "mocha";
import { assert } from "chai";
import sinon from "sinon";
import { Request, Response } from "express";
import {
  clearAllImagesHandlerAsync,
  getLatestImageAsync,
  testHealthHandlerAsync,
  testLatestImageHandlerAsync,
  testStreamHandlerAsync,
} from "../handlers/CameraHandlers";
import { CameraManager } from "../../../../camera/CameraManager";
import { PassThrough, Readable } from "stream";

describe("CameraHandlers.ts", () => {
  let req: Request;
  let res: Response;
  let cameraManager: Partial<CameraManager>;
  let logger: { error: sinon.SinonStub; debug: sinon.SinonStub };
  let statusStub: sinon.SinonStub;
  let jsonSpy: sinon.SinonSpy;
  let sendSpy: sinon.SinonSpy;
  let setHeaderSpy: sinon.SinonSpy;

  beforeEach(() => {
    cameraManager = {
      clearAllImagesAsync: sinon.stub().resolves(true),
      getLatestImageAsync: sinon.stub().resolves(Buffer.from("image-data")),
      captureLatestImageAsync: sinon.stub().resolves(Buffer.from("fresh-image-data")),
    };
    logger = {
      error: sinon.stub(),
      debug: sinon.stub(),
    };
    jsonSpy = sinon.spy();
    sendSpy = sinon.spy(() => res);
    setHeaderSpy = sinon.spy();
    statusStub = sinon.stub().callsFake(() => ({ json: jsonSpy, send: sendSpy }) as any);

    req = {
      app: {
        get: ((key: string) => {
          if (key === "cameraManager") return cameraManager;
          if (key === "logger") return logger;
          return undefined;
        }) as any,
      },
      params: { cameraId: "1" },
      query: {},
      originalUrl: "/api/v2/camera/1/latest-image",
    } as unknown as Request;

    res = {
      status: statusStub as any,
      setHeader: setHeaderSpy as any,
      destroy: sinon.stub() as any,
      once: sinon.stub().callsFake((_event: string, callback: () => void) => {
        void callback;
        return res;
      }) as any,
      locals: {
        defaultProperties: {
          timestamp: "2023-01-01T00:00:00Z",
          requestId: "1234",
        },
      },
    } as unknown as Response;
  });

  afterEach(() => {
    sinon.restore();
  });

  it("returns the latest image when available", async () => {
    await getLatestImageAsync(req, res);

    assert.isTrue(setHeaderSpy.calledOnceWithExactly("Content-Type", "image/jpeg"));
    assert.isTrue(statusStub.calledOnceWithExactly(200));
    assert.isTrue(sendSpy.calledOnceWithExactly(Buffer.from("image-data")));
  });

  it("returns 404 when no latest image exists", async () => {
    (cameraManager.getLatestImageAsync as sinon.SinonStub).resolves(null);

    await getLatestImageAsync(req, res);

    assert.isTrue(statusStub.calledOnceWithExactly(404));
  });

  it("returns 200 when all images are cleared", async () => {
    req.originalUrl = "/api/v2/camera/1/timelapse/images";

    await clearAllImagesHandlerAsync(req, res);

    assert.isTrue((cameraManager.clearAllImagesAsync as sinon.SinonStub).calledOnceWithExactly(1));
    assert.isTrue(statusStub.calledOnceWithExactly(200));
  });

  it("returns 400 for an invalid camera id", async () => {
    req.params = { cameraId: "nope" } as any;

    await getLatestImageAsync(req, res);

    assert.isTrue(statusStub.calledOnceWithExactly(400));
  });

  it("captures a fresh latest image when requested", async () => {
    req.query = { captureNew: "true" } as any;

    await getLatestImageAsync(req, res);

    assert.isTrue(
      (cameraManager.captureLatestImageAsync as sinon.SinonStub).calledOnceWithExactly(1),
    );
    assert.isTrue(sendSpy.calledOnceWithExactly(Buffer.from("fresh-image-data")));
  });

  it("returns 502 when fresh image capture fails", async () => {
    req.query = { captureNew: "1" } as any;
    (cameraManager.captureLatestImageAsync as sinon.SinonStub).resolves(null);

    await getLatestImageAsync(req, res);

    assert.isTrue(statusStub.calledOnceWithExactly(502));
  });

  it("tests a latest image URL and returns the proxied image", async () => {
    req.params = {} as any;
    req.query = { captureUrl: "http://camera:3002/capture" } as any;
    req.originalUrl = "/api/v2/camera/test/latest-image";

    const fetchStub = sinon.stub(globalThis, "fetch").resolves({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "image/jpeg" }),
      body: Readable.toWeb(Readable.from([Buffer.from("proxy-image")])) as ReadableStream,
      arrayBuffer: async () => Buffer.from("proxy-image"),
    } as unknown as globalThis.Response);

    await testLatestImageHandlerAsync(req, res);

    assert.isTrue(fetchStub.calledOnceWithExactly("http://camera:3002/capture", { method: "GET" }));
    assert.isTrue(setHeaderSpy.calledWithExactly("Content-Type", "image/jpeg"));
    assert.isTrue(sendSpy.calledOnceWithExactly(Buffer.from("proxy-image")));
  });

  it("rejects invalid latest image test URLs", async () => {
    req.params = {} as any;
    req.query = { captureUrl: "ftp://camera" } as any;
    req.originalUrl = "/api/v2/camera/test/latest-image";

    await testLatestImageHandlerAsync(req, res);

    assert.isTrue(statusStub.calledOnceWithExactly(400));
  });

  it("tests a health URL and returns status details", async () => {
    req.params = {} as any;
    req.query = { healthUrl: "http://camera:3002/health" } as any;
    req.originalUrl = "/api/v2/camera/test/health";

    const fetchStub = sinon.stub(globalThis, "fetch").resolves({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => '{"status":"ok"}',
    } as unknown as globalThis.Response);

    await testHealthHandlerAsync(req, res);

    assert.isTrue(fetchStub.calledOnceWithExactly("http://camera:3002/health", { method: "GET" }));
    assert.isTrue(statusStub.calledOnceWithExactly(200));
    assert.isTrue(jsonSpy.calledOnce);
  });

  it("tests a stream URL and pipes the upstream response", async () => {
    req.params = {} as any;
    req.query = { streamUrl: "http://camera:3002/stream.mjpg" } as any;
    req.originalUrl = "/api/v2/camera/test/stream";

    const upstreamStream = new PassThrough();
    const fetchStub = sinon.stub(globalThis, "fetch").resolves({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "multipart/x-mixed-replace" }),
      body: Readable.toWeb(upstreamStream) as ReadableStream,
    } as unknown as globalThis.Response);

    await testStreamHandlerAsync(req, res);

    assert.isTrue(fetchStub.calledOnce);
    assert.equal(fetchStub.firstCall.args[0], "http://camera:3002/stream.mjpg");
    assert.deepEqual(fetchStub.firstCall.args[1], { method: "GET" });
  });
});
