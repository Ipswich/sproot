import { Request, Response } from "express";
import { ErrorResponse, SuccessResponse } from "@sproot/sproot-common/dist/api/v2/Responses";
import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { SDBDeviceZone } from "@sproot/sproot-common/dist/database/SDBDeviceZone";
import { getAsync, addAsync, updateAsync, deleteAsync } from "../handlers/DeviceZoneHandlers";
import { assert } from "chai";
import sinon from "sinon";

describe("DeviceZoneHandlers.ts", function () {
  describe("getAsync", function () {
    it("it should return a 200 and a list of device zones", async function () {
      const mockSprootDb = sinon.createStubInstance(MockSprootDB);
      mockSprootDb.getDeviceZonesAsync.resolves([
        { id: 1, name: "Zone 1" },
        { id: 2, name: "Zone 2" },
      ]);
      const mockRequest = {
        app: {
          get: () => mockSprootDb,
        },
        originalUrl: "/api/v2/device-zones",
      } as unknown as Request;

      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const success = (await getAsync(mockRequest, mockResponse)) as SuccessResponse;

      assert.equal(success.statusCode, 200);
      assert.isArray(success.content!.data);
      assert.lengthOf(success.content!.data, 2);
      assert.equal((success.content!.data as SDBDeviceZone[])[0]!.name, "Zone 1");
      assert.equal((success.content!.data as SDBDeviceZone[])[1]!.name, "Zone 2");
    });

    it("it should return a 503 and an error message", async function () {
      const mockSprootDb = sinon.createStubInstance(MockSprootDB);
      mockSprootDb.getDeviceZonesAsync.rejects(new Error("Database error"));
      const mockRequest = {
        app: {
          get: () => mockSprootDb,
        },
        originalUrl: "/api/v2/device-zones",
      } as unknown as Request;

      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const error = (await getAsync(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(error.statusCode, 503);
      assert.equal(error.error!.name, "Internal Server Error");
      assert.include(error.error!.details![0]!, "Failed to retrieve device zones: Database error");
    });
  });

  describe("addAsync", function () {
    it("should return a 201 and the new deviceId", async function () {
      const mockSprootDb = sinon.createStubInstance(MockSprootDB);
      mockSprootDb.addDeviceZoneAsync.resolves(1);
      const mockRequest = {
        app: {
          get: () => mockSprootDb,
        },
        body: {
          name: "New Zone",
        },
        originalUrl: "/api/v2/device-zones",
      } as unknown as Request;

      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const success = (await addAsync(mockRequest, mockResponse)) as SuccessResponse;

      assert.equal(success.statusCode, 201);
      assert.equal(success.content!.data.id, 1);
      assert.equal(success.content!.data.name, "New Zone");
    });

    it("should return a 400 and an error message", async function () {
      const mockSprootDb = sinon.createStubInstance(MockSprootDB);
      const mockRequest = {
        app: {
          get: () => mockSprootDb,
        },
        body: {
          name: "",
        },
        originalUrl: "/api/v2/device-zones",
      } as unknown as Request;

      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const error = (await addAsync(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(error.statusCode, 400);
      assert.equal(error.error!.name, "Bad Request");
      assert.include(error.error!.details![0]!, "Device zone name is required.");
    });

    it("should return a 503 and an error message", async function () {
      const mockSprootDb = sinon.createStubInstance(MockSprootDB);
      mockSprootDb.addDeviceZoneAsync.rejects(new Error("Database error"));
      const mockRequest = {
        app: {
          get: () => mockSprootDb,
        },
        body: {
          name: "New Zone",
        },
        originalUrl: "/api/v2/device-zones",
      } as unknown as Request;

      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const error = (await addAsync(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(error.statusCode, 503);
      assert.equal(error.error!.name, "Internal Server Error");
      assert.include(error.error!.details![0]!, "Failed to add device zone: Database error");
    });
  });

  describe("updateAsync", function () {
    it("should return a 200 and the updated device zone", async function () {
      const mockSprootDb = sinon.createStubInstance(MockSprootDB);
      mockSprootDb.getDeviceZonesAsync.resolves([{ id: 1, name: "Old Zone" } as SDBDeviceZone]);
      mockSprootDb.updateDeviceZoneAsync.resolves();
      const mockRequest = {
        app: {
          get: () => mockSprootDb,
        },
        params: {
          deviceZoneId: "1",
        },
        body: {
          name: "Updated Zone",
        },
        originalUrl: "/api/v2/device-zones/1",
      } as unknown as Request;

      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const success = (await updateAsync(mockRequest, mockResponse)) as SuccessResponse;

      assert.equal(success.statusCode, 200);
      assert.equal(success.content!.data.id, 1);
      assert.equal(success.content!.data.name, "Updated Zone");
    });

    it("should return a 400 and an error message", async function () {
      const mockSprootDb = sinon.createStubInstance(MockSprootDB);
      mockSprootDb.getDeviceZonesAsync.resolves([{ id: 1, name: "Old Zone" } as SDBDeviceZone]);
      const mockRequest = {
        app: {
          get: () => mockSprootDb,
        },
        params: {
          deviceZoneId: "1",
        },
        body: {
          name: "",
        },
        originalUrl: "/api/v2/device-zones/abc",
      } as unknown as Request;

      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.error!.name, "Bad Request");
      assert.include(error.error!.details![0]!, "Device zone name is required.");
    });

    it("should return a 404 and an error message", async function () {
      const mockSprootDb = sinon.createStubInstance(MockSprootDB);
      mockSprootDb.getDeviceZonesAsync.resolves([]);
      const mockRequest = {
        app: {
          get: () => mockSprootDb,
        },
        params: {
          deviceZoneId: "1",
        },
        body: {
          name: "Updated Zone",
        },
        originalUrl: "/api/v2/device-zones/1",
      } as unknown as Request;

      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(error.statusCode, 404);
      assert.equal(error.error!.name, "Not Found");
      assert.include(error.error!.details![0]!, "Device zone with ID 1 not found.");
    });

    it("should return a 503 and an error message", async function () {
      const mockSprootDb = sinon.createStubInstance(MockSprootDB);
      mockSprootDb.getDeviceZonesAsync.resolves([{ id: 1, name: "Old Zone" } as SDBDeviceZone]);
      mockSprootDb.updateDeviceZoneAsync.rejects(new Error("Database error"));
      const mockRequest = {
        app: {
          get: () => mockSprootDb,
        },
        params: {
          deviceZoneId: "1",
        },
        body: {
          name: "Updated Zone",
        },
        originalUrl: "/api/v2/device-zones/1",
      } as unknown as Request;

      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(error.statusCode, 503);
      assert.equal(error.error!.name, "Internal Server Error");
      assert.include(error.error!.details![0]!, "Failed to update device zone: Database error");
    });
  });

  describe("deleteAsync", function () {
    it("should return a 200 and a success message", async function () {
      const mockSprootDb = sinon.createStubInstance(MockSprootDB);
      mockSprootDb.deleteDeviceZoneAsync.resolves();
      const mockRequest = {
        app: {
          get: () => mockSprootDb,
        },
        params: {
          deviceZoneId: "1",
        },
        originalUrl: "/api/v2/device-zones/1",
      } as unknown as Request;
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const success = (await deleteAsync(mockRequest, mockResponse)) as SuccessResponse;

      assert.equal(success.statusCode, 200);
      assert.equal(success.content!.data, "Device zone with ID 1 successfully deleted.");
    });

    it("should return a 400 and an error message", async function () {
      const mockSprootDb = sinon.createStubInstance(MockSprootDB);
      const mockRequest = {
        app: {
          get: () => mockSprootDb,
        },
        params: {
          deviceZoneId: "abc",
        },
        originalUrl: "/api/v2/device-zones/abc",
      } as unknown as Request;

      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const error = (await deleteAsync(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(error.statusCode, 400);
      assert.equal(error.error!.name, "Bad Request");
      assert.include(error.error!.details![0]!, "Valid device zone ID is required.");
    });

    it("should return a 503 and an error message", async function () {
      const mockSprootDb = sinon.createStubInstance(MockSprootDB);
      mockSprootDb.deleteDeviceZoneAsync.rejects(new Error("Database error"));
      const mockRequest = {
        app: {
          get: () => mockSprootDb,
        },
        params: {
          deviceZoneId: "1",
        },
        originalUrl: "/api/v2/device-zones/1",
      } as unknown as Request;

      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const error = (await deleteAsync(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(error.statusCode, 503);
      assert.equal(error.error!.name, "Internal Server Error");
      assert.include(error.error!.details![0]!, "Failed to delete device zone: Database error");
    });
  });
});
