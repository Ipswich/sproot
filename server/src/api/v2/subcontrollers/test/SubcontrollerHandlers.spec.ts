import { assert } from "chai";
import { Request, Response } from "express";
import sinon from "sinon";
import { deleteSubcontrollerAsync } from "../handlers/SubcontrollerHandlers";
import { DeferredDeletionService } from "../../../../system/DeferredDeletionService";
import { SensorList } from "../../../../sensors/list/SensorList";
import { OutputList } from "../../../../outputs/list/OutputList";
import { DI_KEYS } from "../../../../utils/DependencyInjectionConstants";
import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";

describe("SubcontrollerHandlers.ts tests", () => {
  const mockResponse = {
    locals: {
      defaultProperties: {
        timestamp: new Date().toISOString(),
        requestId: "1234",
      },
    },
  } as unknown as Response;

  let deferredDeletionService: sinon.SinonStubbedInstance<DeferredDeletionService>;
  let sensorList: sinon.SinonStubbedInstance<SensorList>;
  let outputList: sinon.SinonStubbedInstance<OutputList>;

  beforeEach(() => {
    deferredDeletionService = sinon.createStubInstance(DeferredDeletionService);
    sensorList = sinon.createStubInstance(SensorList);
    outputList = sinon.createStubInstance(OutputList);
    deferredDeletionService.deleteSubcontrollerAsync.resolves("queued");
    sensorList.regenerateAsync.resolves(sensorList as unknown as SensorList);
    outputList.regenerateAsync.resolves(outputList as unknown as OutputList);
  });

  afterEach(() => {
    sinon.restore();
  });

  it("returns 200 when a subcontroller deletion is queued", async () => {
    const mockRequest = {
      app: {
        get: (key: string) => {
          if (key === DI_KEYS.DeferredDeletionService) return deferredDeletionService;
          if (key === DI_KEYS.SensorList) return sensorList;
          if (key === DI_KEYS.OutputList) return outputList;
          return undefined;
        },
      },
      params: { deviceId: "9" },
      originalUrl: "/api/v2/subcontrollers/9",
    } as unknown as Request;

    const result = (await deleteSubcontrollerAsync(mockRequest, mockResponse)) as SuccessResponse;
    assert.equal(result.statusCode, 200);
    assert.isTrue(deferredDeletionService.deleteSubcontrollerAsync.calledOnceWithExactly(9));
  });

  it("returns 404 when the subcontroller is already gone", async () => {
    deferredDeletionService.deleteSubcontrollerAsync.resolves("not-found");

    const mockRequest = {
      app: {
        get: (key: string) => {
          if (key === DI_KEYS.DeferredDeletionService) return deferredDeletionService;
          if (key === DI_KEYS.SensorList) return sensorList;
          if (key === DI_KEYS.OutputList) return outputList;
          return undefined;
        },
      },
      params: { deviceId: "9" },
      originalUrl: "/api/v2/subcontrollers/9",
    } as unknown as Request;

    const result = (await deleteSubcontrollerAsync(mockRequest, mockResponse)) as ErrorResponse;
    assert.equal(result.statusCode, 404);
  });
});