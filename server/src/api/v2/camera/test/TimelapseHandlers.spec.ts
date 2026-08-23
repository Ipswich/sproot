import { assert } from "chai";
import * as sinon from "sinon";
import { Request, Response } from "express";
import { CameraManager } from "../../../../camera/CameraManager";
import {
  getTimelapseArchiveAsync,
  postRegenerateTimelapseArchive,
  getTimelapseGenerationStatus,
} from "../handlers/TimelapseHandlers";
import { createReadStream } from "fs";

describe("TimelapseHandlers", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let cameraManager: Partial<CameraManager>;
  let jsonSpy: sinon.SinonSpy;
  let statusStub: sinon.SinonStub;
  let setHeaderSpy: sinon.SinonSpy;

  beforeEach(() => {
    cameraManager = {
      getTimelapseArchiveAsync: sinon.stub(),
      regenerateTimelapseArchiveAsync: sinon.stub(),
      getTimelapseArchiveProgress: sinon.stub(),
    };

    jsonSpy = sinon.spy();
    statusStub = sinon.stub().returns({ json: jsonSpy });
    setHeaderSpy = sinon.spy();

    req = {
      app: {
        get: (_dependency: string) => cameraManager,
      },
      params: { cameraId: "1" },
      originalUrl: "/api/v2/camera/1/timelapse/archive",
    } as unknown as Request;

    res = {
      status: statusStub,
      setHeader: setHeaderSpy,
      locals: {
        defaultProperties: { requestId: "test-id" },
      },
      once: sinon.stub(),
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  it("returns 404 when no timelapse archive is available", async () => {
    (cameraManager.getTimelapseArchiveAsync as sinon.SinonStub).resolves(null);

    await getTimelapseArchiveAsync(req as Request, res as Response);

    assert.isTrue(statusStub.calledOnceWith(404));
  });

  it("queues timelapse regeneration and returns 202 status", () => {
    postRegenerateTimelapseArchive(req as Request, res as Response);

    assert.isTrue(
      (cameraManager.regenerateTimelapseArchiveAsync as sinon.SinonStub).calledOnceWithExactly(1),
    );
    assert.isTrue(statusStub.calledOnceWith(202));
  });

  it("returns the current timelapse generation status", () => {
    const mockStatus = { isGenerating: true, archiveProgress: 50 };
    (cameraManager.getTimelapseArchiveProgress as sinon.SinonStub).returns(mockStatus);

    getTimelapseGenerationStatus(req as Request, res as Response);

    assert.isTrue(
      (cameraManager.getTimelapseArchiveProgress as sinon.SinonStub).calledOnceWithExactly(1),
    );
    assert.isTrue(statusStub.calledOnceWith(200));
  });

  it("sets archive headers when a timelapse archive exists", async () => {
    const mockArchive = createReadStream("/dev/null");
    (cameraManager.getTimelapseArchiveAsync as sinon.SinonStub).resolves(mockArchive);
    (mockArchive as any).pipe = sinon.stub();

    await getTimelapseArchiveAsync(req as Request, res as Response);

    assert.isTrue(setHeaderSpy.calledWith("Content-Type", "application/x-tar"));
  });
});
