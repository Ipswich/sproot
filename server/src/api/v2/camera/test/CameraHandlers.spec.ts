import { describe, it, beforeEach, afterEach } from "mocha";
import { assert } from "chai";
import sinon from "sinon";
import { Request, Response } from "express";
import {
  clearAllImagesHandlerAsync,
  getLatestImageAsync,
  reconnectLivestreamAsync,
} from "../handlers/CameraHandlers";
import { CameraManager } from "../../../../camera/CameraManager";

describe("CameraHandlers.ts tests", () => {
  let req: Request;
  let res: Response;
  let cameraManager: Partial<CameraManager>;
  let logger: { error: sinon.SinonStub };
  let statusStub: sinon.SinonStub;
  let jsonSpy: sinon.SinonSpy;
  let sendSpy: sinon.SinonSpy;
  let setHeaderSpy: sinon.SinonSpy;

  beforeEach(() => {
    cameraManager = {
      clearAllImagesAsync: sinon.stub().resolves(true),
      getLatestImageAsync: sinon.stub().resolves(Buffer.from("image-data")),
      reconnectLivestreamAsync: sinon.stub().resolves(true),
    };
    logger = {
      error: sinon.stub(),
    };
    jsonSpy = sinon.spy();
    sendSpy = sinon.spy();
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
      originalUrl: "/api/v2/camera/latest-image",
    } as Request;

    res = {
      status: statusStub as any,
      setHeader: setHeaderSpy as any,
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

  it("should return the latest image when available", async () => {
    await getLatestImageAsync(req, res);

    assert.isTrue(setHeaderSpy.calledOnceWithExactly("Content-Type", "image/jpeg"));
    assert.isTrue(statusStub.calledOnceWithExactly(200));
    assert.isTrue(sendSpy.calledOnceWithExactly(Buffer.from("image-data")));
  });

  it("should return 404 when no latest image exists", async () => {
    (cameraManager.getLatestImageAsync as sinon.SinonStub).resolves(null);

    await getLatestImageAsync(req, res);

    assert.isTrue(statusStub.calledOnceWithExactly(404));
    assert.isTrue(jsonSpy.calledOnce);
    assert.deepEqual(jsonSpy.firstCall.args[0], {
      statusCode: 404,
      error: {
        name: "Not Found",
        url: "/api/v2/camera/latest-image",
        details: ["No latest image"],
      },
      timestamp: "2023-01-01T00:00:00Z",
      requestId: "1234",
    });
  });

  it("should return 200 when all images are cleared", async () => {
    req.originalUrl = "/api/v2/camera/images";

    await clearAllImagesHandlerAsync(req, res);

    assert.isTrue((cameraManager.clearAllImagesAsync as sinon.SinonStub).calledOnce);
    assert.isTrue(statusStub.calledOnceWithExactly(200));
    assert.deepEqual(jsonSpy.firstCall.args[0], {
      statusCode: 200,
      content: {
        data: "All images cleared successfully",
      },
      timestamp: "2023-01-01T00:00:00Z",
      requestId: "1234",
    });
  });

  it("should return 409 when images cannot be cleared right now", async () => {
    req.originalUrl = "/api/v2/camera/images";
    (cameraManager.clearAllImagesAsync as sinon.SinonStub).resolves(false);

    await clearAllImagesHandlerAsync(req, res);

    assert.isTrue(statusStub.calledOnceWithExactly(409));
    assert.deepEqual(jsonSpy.firstCall.args[0].error.details, [
      "Could not clear images at this time. Please try again later.",
    ]);
  });

  it("should return 500 when clearing images throws", async () => {
    req.originalUrl = "/api/v2/camera/images";
    (cameraManager.clearAllImagesAsync as sinon.SinonStub).rejects(new Error("boom"));

    await clearAllImagesHandlerAsync(req, res);

    assert.isTrue((logger.error as sinon.SinonStub).calledOnce);
    assert.isTrue(statusStub.calledOnceWithExactly(500));
    assert.deepEqual(jsonSpy.firstCall.args[0].error.details, ["Could not clear all images"]);
  });

  it("should return 200 when livestream reconnect succeeds", async () => {
    req.originalUrl = "/api/v2/camera/reconnect";

    await reconnectLivestreamAsync(req, res);

    assert.isTrue((cameraManager.reconnectLivestreamAsync as sinon.SinonStub).calledOnce);
    assert.isTrue(statusStub.calledOnceWithExactly(200));
    assert.deepEqual(jsonSpy.firstCall.args[0], {
      statusCode: 200,
      content: {
        data: "Livestream successfully reconnected",
      },
      timestamp: "2023-01-01T00:00:00Z",
      requestId: "1234",
    });
  });

  it("should return 502 when livestream reconnect fails", async () => {
    req.originalUrl = "/api/v2/camera/reconnect";
    (cameraManager.reconnectLivestreamAsync as sinon.SinonStub).resolves(false);

    await reconnectLivestreamAsync(req, res);

    assert.isTrue((logger.error as sinon.SinonStub).calledOnce);
    assert.isTrue(statusStub.calledOnceWithExactly(502));
    assert.deepEqual(jsonSpy.firstCall.args[0].error.details, [
      "Could not connect to camera server",
    ]);
  });
});
