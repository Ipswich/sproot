import { assert } from "chai";
import * as sinon from "sinon";
import { Request, Response } from "express";
import { CameraManager } from "../../../../camera/CameraManager";
import {
  getTimelapseArchiveAsync,
  postRegenerateTimelapseArchive,
  getTimelapseGenerationStatus,
} from "../handlers/TimelapseHandlers";

describe("TimelapseHandlers", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let cameraManager: Partial<CameraManager>;
  let sendSpy: sinon.SinonSpy;
  let jsonSpy: sinon.SinonSpy;
  let statusStub: sinon.SinonStub;
  let setHeaderSpy: sinon.SinonSpy;

  beforeEach(() => {
    cameraManager = {
      getTimelapseArchiveAsync: sinon.stub(),
      regenerateTimelapseArchiveAsync: sinon.stub(),
      getTimelapseArchiveProgressAsync: sinon.stub(),
    };

    sendSpy = sinon.spy();
    jsonSpy = sinon.spy();
    statusStub = sinon.stub().returns({ send: sendSpy, json: jsonSpy });
    setHeaderSpy = sinon.spy();

    req = {
      app: {
        get: (_dependency: string) => cameraManager,
      },
      originalUrl: "/api/v2/camera/timelapse",
    } as unknown as Request;

    res = {
      status: statusStub,
      setHeader: setHeaderSpy,
      locals: {
        defaultProperties: { requestId: "test-id" },
      },
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("getTimelapseArchiveAsync", () => {
    it("should return 200 with the archive when a timelapse archive exists", async () => {
      const mockArchive = Buffer.from("mock archive data");
      (cameraManager.getTimelapseArchiveAsync as sinon.SinonStub).resolves(mockArchive);

      await getTimelapseArchiveAsync(req as Request, res as Response);

      assert.isTrue(setHeaderSpy.calledOnceWith("Content-Type", "application/x-tar"));
      assert.isTrue(statusStub.calledOnceWith(200));
      assert.isTrue(sendSpy.calledOnceWith(mockArchive));
    });

    it("should return 404 when no timelapse archive is available", async () => {
      (cameraManager.getTimelapseArchiveAsync as sinon.SinonStub).resolves(null);

      await getTimelapseArchiveAsync(req as Request, res as Response);

      assert.isTrue(statusStub.calledOnceWith(404));
      assert.isTrue(jsonSpy.calledOnce);
      const jsonResponse = jsonSpy.firstCall.args[0];
      assert.equal(jsonResponse.statusCode, 404);
      assert.equal(jsonResponse.error.name, "Not Found");
      assert.deepEqual(jsonResponse.error.details, ["No timelapse archive available"]);
      assert.equal(jsonResponse.error.url, "/api/v2/camera/timelapse");
    });
  });

  describe("postRegenerateTimelapseArchive", () => {
    it("should queue timelapse regeneration and return 202 status", () => {
      postRegenerateTimelapseArchive(req as Request, res as Response);

      assert.isTrue((cameraManager.regenerateTimelapseArchiveAsync as sinon.SinonStub).calledOnce);
      assert.isTrue(statusStub.calledOnceWith(202));
      assert.isTrue(jsonSpy.calledOnce);
      const jsonResponse = jsonSpy.firstCall.args[0];
      assert.equal(jsonResponse.statusCode, 202);
      assert.equal(jsonResponse.message, "Timelapse archive regeneration queued.");
      assert.deepEqual(jsonResponse.requestId, "test-id");
    });
  });

  describe("getTimelapseGenerationStatus", () => {
    it("should return the current timelapse generation status", () => {
      const mockStatus = { inProgress: true, percentComplete: 50 };
      (cameraManager.getTimelapseArchiveProgressAsync as sinon.SinonStub).returns(mockStatus);

      getTimelapseGenerationStatus(req as Request, res as Response);

      assert.isTrue((cameraManager.getTimelapseArchiveProgressAsync as sinon.SinonStub).calledOnce);
      assert.isTrue(statusStub.calledOnceWith(200));
      assert.isTrue(jsonSpy.calledOnce);
      const jsonResponse = jsonSpy.firstCall.args[0];
      assert.equal(jsonResponse.statusCode, 200);
      assert.deepEqual(jsonResponse.content?.data, mockStatus);
      assert.deepEqual(jsonResponse.requestId, "test-id");
    });
  });
});
