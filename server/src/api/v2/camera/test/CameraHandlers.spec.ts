import { describe, it, beforeEach, afterEach } from "mocha";
import { assert } from "chai";
import sinon from "sinon";
import { Request, Response } from "express";
import { clearAllImagesHandlerAsync, getLatestImageAsync } from "../handlers/CameraHandlers";
import { CameraManager } from "../../../../camera/CameraManager";

describe("CameraHandlers.ts", () => {
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
      params: { cameraId: "1" },
      originalUrl: "/api/v2/camera/1/latest-image",
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
});
