import { Response, Request } from "express";
import { getAvailableDevices } from "../handlers/AvailableDevicesHandlers";
import { SensorList } from "../../../../sensors/list/SensorList";
import { DI_KEYS } from "../../../../utils/DependencyInjectionConstants";
import { Models } from "@sproot/common/sensors/Models";
import { AvailableDevice } from "@sproot/common/utility/DeviceTypes";
import { assert } from "chai";
import sinon from "sinon";
import { ErrorResponse, SuccessResponse } from "@sproot/api/v2/Responses";

describe("AvailableDevicesHandlers.ts tests", function () {
  afterEach(() => {
    sinon.restore();
  });

  function buildMockSensorList(): sinon.SinonStubbedInstance<SensorList> {
    return sinon.createStubInstance(SensorList);
  }

  function buildMockRequest(
    params: Record<string, string>,
    query?: Record<string, string>,
    sensorList?: sinon.SinonStubbedInstance<SensorList>,
  ): Request {
    const mockSensorList = sensorList || buildMockSensorList();
    return {
      params,
      query: query || {},
      originalUrl: "/api/v2/sensors/available-devices/BME280",
      app: {
        get: (key: string) => {
          if (key === DI_KEYS.SensorList) return mockSensorList;
          return undefined;
        },
      } as unknown as Request["app"],
    } as Request;
  }

  function buildMockResponse(): Response {
    return {
      locals: {
        defaultProperties: {
          requestId: "test-request-id",
        },
      },
    } as unknown as Response;
  }

  it("should return 400 when model is undefined", async () => {
    const mockRequest = buildMockRequest({});
    const mockResponse = buildMockResponse();

    const result = await getAvailableDevices(mockRequest, mockResponse);

    assert.equal(result.statusCode, 400);
    assert.equal((result as ErrorResponse).error.name, "Bad Request");
    assert.include((result as ErrorResponse).error.details[0], "Model cannot be undefined.");
  });

  it("should return 400 when model is not recognized", async () => {
    const mockRequest = buildMockRequest({ model: "NONEXISTENT_MODEL" });
    const mockResponse = buildMockResponse();

    const result = await getAvailableDevices(mockRequest, mockResponse);

    assert.equal(result.statusCode, 400);
    assert.equal((result as ErrorResponse).error.name, "Bad Request");
    assert.include((result as ErrorResponse).error.details[0], "not recognized");
  });

  it("should return 200 with devices when model is valid", async () => {
    const mockSensorList = buildMockSensorList();
    const mockDevices: AvailableDevice[] = [
      { address: "0x76", alias: null, pins: null, subcontrollerId: null },
    ];
    mockSensorList.getAvailableDevices.resolves(mockDevices);

    const mockRequest = buildMockRequest(
      { model: "BME280" },
      { filterUsed: "true" },
      mockSensorList,
    );
    const mockResponse = buildMockResponse();

    const result = await getAvailableDevices(mockRequest, mockResponse);

    assert.equal(result.statusCode, 200);
    assert.deepEqual((result as SuccessResponse).content?.data, mockDevices);
    sinon.assert.calledWith(mockSensorList.getAvailableDevices, "BME280", true);
  });

  it("should pass filterUsed=false when query is 'false'", async () => {
    const mockSensorList = buildMockSensorList();
    mockSensorList.getAvailableDevices.resolves([]);

    const mockRequest = buildMockRequest(
      { model: "BME280" },
      { filterUsed: "false" },
      mockSensorList,
    );
    const mockResponse = buildMockResponse();

    await getAvailableDevices(mockRequest, mockResponse);

    sinon.assert.calledWith(mockSensorList.getAvailableDevices, "BME280", false);
  });

  it("should pass filterUsed=true by default when query is not provided", async () => {
    const mockSensorList = buildMockSensorList();
    mockSensorList.getAvailableDevices.resolves([]);

    const mockRequest = buildMockRequest({ model: "BME280" }, undefined, mockSensorList);
    const mockResponse = buildMockResponse();

    await getAvailableDevices(mockRequest, mockResponse);

    sinon.assert.calledWith(mockSensorList.getAvailableDevices, "BME280", true);
  });

  it("should return 400 with error details when sensorList throws", async () => {
    const mockSensorList = buildMockSensorList();
    mockSensorList.getAvailableDevices.rejects(new Error("I2C bus error"));

    const mockRequest = buildMockRequest({ model: "BME280" }, undefined, mockSensorList);
    const mockResponse = buildMockResponse();

    const result = await getAvailableDevices(mockRequest, mockResponse);

    assert.equal(result.statusCode, 400);
    assert.equal((result as ErrorResponse).error.name, "Bad Request");
    assert.include((result as ErrorResponse).error.details[0], "I2C bus error");
  });

  it("should list all supported models from Models enum", () => {
    const modelValues = Object.values(Models) as string[];
    assert.isAtLeast(modelValues.length, 1);
  });
});
