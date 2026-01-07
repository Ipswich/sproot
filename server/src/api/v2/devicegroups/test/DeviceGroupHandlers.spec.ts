import { Request, Response } from "express";
import { ErrorResponse, SuccessResponse } from "@sproot/sproot-common/dist/api/v2/Responses";
import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { SDBDeviceGroup } from "@sproot/sproot-common/dist/database/SDBDeviceGroup";
import {
  getAsync,
  addAsync,
  updateAsync,
  deleteAsync,
} from "../../devicegroups/handlers/DeviceGroupHandlers";
import { assert } from "chai";
import sinon from "sinon";

describe("DeviceGroupHandlers.ts", function () {
  describe("getAsync", function () {
    it("it should return a 200 and a list of device groups", async function () {
      const mockSprootDb = sinon.createStubInstance(MockSprootDB);
      mockSprootDb.getDeviceGroupsAsync.resolves([
        { id: 1, name: "Group 1" },
        { id: 2, name: "Group 2" },
      ]);
      const mockRequest = {
        app: {
          get: () => mockSprootDb,
        },
        originalUrl: "/api/v2/device-groups",
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
      assert.equal((success.content!.data as SDBDeviceGroup[])[0]!.name, "Group 1");
      assert.equal((success.content!.data as SDBDeviceGroup[])[1]!.name, "Group 2");
    });

    it("it should return a 503 and an error message", async function () {
      const mockSprootDb = sinon.createStubInstance(MockSprootDB);
      mockSprootDb.getDeviceGroupsAsync.rejects(new Error("Database error"));
      const mockRequest = {
        app: {
          get: () => mockSprootDb,
        },
        originalUrl: "/api/v2/device-groups",
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
      assert.include(error.error!.details![0]!, "Failed to retrieve device groups: Database error");
    });
  });

  describe("addAsync", function () {
    it("should return a 201 and the new deviceId", async function () {
      const mockSprootDb = sinon.createStubInstance(MockSprootDB);
      mockSprootDb.addDeviceGroupAsync.resolves(1);
      const mockRequest = {
        app: {
          get: () => mockSprootDb,
        },
        body: {
          name: "New Group",
        },
        originalUrl: "/api/v2/device-groups",
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
      assert.equal(success.content!.data.name, "New Group");
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
        originalUrl: "/api/v2/device-groups",
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
      assert.include(error.error!.details![0]!, "Device group name is required.");
    });

    it("should return a 503 and an error message", async function () {
      const mockSprootDb = sinon.createStubInstance(MockSprootDB);
      mockSprootDb.addDeviceGroupAsync.rejects(new Error("Database error"));
      const mockRequest = {
        app: {
          get: () => mockSprootDb,
        },
        body: {
          name: "New Group",
        },
        originalUrl: "/api/v2/device-groups",
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
      assert.include(error.error!.details![0]!, "Failed to add device group: Database error");
    });
  });

  describe("updateAsync", function () {
    it("should return a 200 and the updated device group", async function () {
      const mockSprootDb = sinon.createStubInstance(MockSprootDB);
      mockSprootDb.getDeviceGroupsAsync.resolves([{ id: 1, name: "Old Group" } as SDBDeviceGroup]);
      mockSprootDb.updateDeviceGroupAsync.resolves();
      const mockRequest = {
        app: {
          get: () => mockSprootDb,
        },
        params: {
          deviceGroupId: "1",
        },
        body: {
          name: "Updated Group",
        },
        originalUrl: "/api/v2/device-groups/1",
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
      assert.equal(success.content!.data.name, "Updated Group");
    });

    it("should return a 400 and an error message", async function () {
      const mockSprootDb = sinon.createStubInstance(MockSprootDB);
      mockSprootDb.getDeviceGroupsAsync.resolves([{ id: 1, name: "Old Group" } as SDBDeviceGroup]);
      const mockRequest = {
        app: {
          get: () => mockSprootDb,
        },
        params: {
          deviceGroupId: "1",
        },
        body: {
          name: "",
        },
        originalUrl: "/api/v2/device-groups/abc",
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
      assert.include(error.error!.details![0]!, "Device group name is required.");
    });

    it("should return a 404 and an error message", async function () {
      const mockSprootDb = sinon.createStubInstance(MockSprootDB);
      mockSprootDb.getDeviceGroupsAsync.resolves([]);
      const mockRequest = {
        app: {
          get: () => mockSprootDb,
        },
        params: {
          deviceGroupId: "1",
        },
        body: {
          name: "Updated Group",
        },
        originalUrl: "/api/v2/device-groups/1",
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
      assert.include(error.error!.details![0]!, "Device group with ID 1 not found.");
    });

    it("should return a 503 and an error message", async function () {
      const mockSprootDb = sinon.createStubInstance(MockSprootDB);
      mockSprootDb.getDeviceGroupsAsync.resolves([{ id: 1, name: "Old Group" } as SDBDeviceGroup]);
      mockSprootDb.updateDeviceGroupAsync.rejects(new Error("Database error"));
      const mockRequest = {
        app: {
          get: () => mockSprootDb,
        },
        params: {
          deviceGroupId: "1",
        },
        body: {
          name: "Updated Group",
        },
        originalUrl: "/api/v2/device-groups/1",
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
      assert.include(error.error!.details![0]!, "Failed to update device group: Database error");
    });
  });

  describe("deleteAsync", function () {
    it("should return a 200 and a success message", async function () {
      const mockSprootDb = sinon.createStubInstance(MockSprootDB);
      mockSprootDb.deleteDeviceGroupAsync.resolves();
      const mockRequest = {
        app: {
          get: () => mockSprootDb,
        },
        params: {
          deviceGroupId: "1",
        },
        originalUrl: "/api/v2/device-groups/1",
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
      assert.equal(success.content!.data, "Device group with ID 1 successfully deleted.");
    });

    it("should return a 400 and an error message", async function () {
      const mockSprootDb = sinon.createStubInstance(MockSprootDB);
      const mockRequest = {
        app: {
          get: () => mockSprootDb,
        },
        params: {
          deviceGroupId: "abc",
        },
        originalUrl: "/api/v2/device-groups/abc",
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
      assert.include(error.error!.details![0]!, "Valid device group ID is required.");
    });

    it("should return a 503 and an error message", async function () {
      const mockSprootDb = sinon.createStubInstance(MockSprootDB);
      mockSprootDb.deleteDeviceGroupAsync.rejects(new Error("Database error"));
      const mockRequest = {
        app: {
          get: () => mockSprootDb,
        },
        params: {
          deviceGroupId: "1",
        },
        originalUrl: "/api/v2/device-groups/1",
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
      assert.include(error.error!.details![0]!, "Failed to delete device group: Database error");
    });
  });
});
