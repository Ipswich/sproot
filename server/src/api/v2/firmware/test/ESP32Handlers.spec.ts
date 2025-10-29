import { assert } from "chai";
import sinon from "sinon";
import { Request, Response } from "express";

import { getESP32ManifestAsync, getESP32FirmwareBinaryAsync } from "../handlers/ESP32Handlers";
import { FirmwareManager } from "../../../../system/FirmwareManager";
import { ErrorResponse } from "@sproot/api/v2/Responses";
import { createReadStream } from "fs";

describe("ESP32Handlers.ts tests", function () {
  describe("getESP32ManifestAsync", function () {
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("returns 200 and manifest data when FirmwareManager resolves", async () => {
      const fakeManifest = {
        version: "v1.0.0",
        path: "/firmware/esp32/firmware.bin",
        sha256: "abc123",
      };
      sandbox
        .stub(FirmwareManager.ESP32, "getESP32ManifestAsync")
        .resolves(JSON.stringify(fakeManifest));

      const req = {
        originalUrl: "/api/v2/firmware/esp32/manifest",
      };

      const res = {
        locals: {
          defaultProperties: {
            requestId: "req-123",
            timestamp: "2023-01-01T00:00:00Z",
          },
        },
      };

      const result = (await getESP32ManifestAsync(
        req as Request,
        res as unknown as Response,
      )) as ErrorResponse;

      assert.isObject(result, "result should be an object");
      assert.strictEqual(result.statusCode, 200, "statusCode should be 200");
      assert.deepEqual((result as any).content.data, JSON.stringify(fakeManifest));
      assert.equal(result.requestId, "req-123");
      assert.equal(result.timestamp, "2023-01-01T00:00:00Z");
    });

    it("returns 500 and error details when FirmwareManager throws", async () => {
      const err = new Error("ERROR!");
      sandbox.stub(FirmwareManager.ESP32, "getESP32ManifestAsync").rejects(err);

      const req = {
        originalUrl: "/api/v2/firmware/esp32/manifest",
      };

      const res = {
        locals: {
          defaultProperties: {
            requestId: "req-123",
            timestamp: "2023-01-01T00:00:00Z",
          },
        },
      };

      const result = (await getESP32ManifestAsync(
        req as Request,
        res as unknown as Response,
      )) as ErrorResponse;

      assert.strictEqual(result.statusCode, 500, "statusCode should be 500");
      assert.strictEqual(result.error.name, "Internal Server Error");
      assert.strictEqual(result.error.url, req.originalUrl);
      assert.equal(result.error.details[0], `Failed to retrieve ESP32 manifest: ${err.message}`);
      assert.equal(result.requestId, "req-123");
      assert.equal(result.timestamp, "2023-01-01T00:00:00Z");
    });
  });

  describe("getESP32FirmwareBinaryAsync", function () {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let sendSpy: sinon.SinonSpy;
    let jsonSpy: sinon.SinonSpy;
    let statusStub: sinon.SinonStub;
    let setHeaderSpy: sinon.SinonSpy;
    this.beforeEach(function () {
      sendSpy = sinon.spy();
      jsonSpy = sinon.spy();
      statusStub = sinon.stub().returns({ send: sendSpy, json: jsonSpy });
      setHeaderSpy = sinon.spy();

      req = {
        app: {},
        originalUrl: "/api/v2/firmware/esp32/firmware.bin",
      } as unknown as Request;

      res = {
        status: statusStub,
        setHeader: setHeaderSpy,
        locals: {
          defaultProperties: { requestId: "test-id" },
        },
        on: sinon.stub(),
        once: sinon.stub(),
        emit: sinon.stub(),
      };
    });

    afterEach(function () {
      sinon.restore();
    });

    it("returns 200 and streams data when FirmwareManager resolves", async () => {
      const mockBinary = createReadStream("path/to/mock/binary.bin");
      sinon
        .stub(FirmwareManager.ESP32, "getESP32FirmwareBinaryAsync")
        .resolves({ stream: mockBinary, size: 80 });

      await getESP32FirmwareBinaryAsync(req as Request, res as Response);

      assert.isTrue(setHeaderSpy.calledWith("Content-Type", "application/octet-stream"));
      assert.isTrue(setHeaderSpy.calledWith("Content-Length", "80"));
      assert.isTrue(
        setHeaderSpy.calledWith("Content-Disposition", "attachment; filename=firmware.bin"),
      );
    });

    it("returns 500 and error details when FirmwareManager throws", async () => {
      const err = new Error("ERROR!");
      sinon.stub(FirmwareManager.ESP32, "getESP32FirmwareBinaryAsync").rejects(err);

      await getESP32FirmwareBinaryAsync(req as Request, res as Response);

      assert.strictEqual(statusStub.calledWith(500), true);
      assert.strictEqual(jsonSpy.calledOnce, true);

      const jsonResponse = jsonSpy.getCall(0).args[0];
      assert.strictEqual(jsonResponse.statusCode, 500);
      assert.strictEqual(jsonResponse.error.name, "Internal Server Error");
      assert.strictEqual(jsonResponse.error.url, req.originalUrl);
      assert.equal(jsonResponse.error.details[0], `Failed to retrieve ESP32: ${err.message}`);
      assert.equal(jsonResponse.requestId, "test-id");
    });
  });
});
