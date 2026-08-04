import { getAvailableDevices } from "../AvailableDevicesHandlers";
import { OutputList } from "../../../../../outputs/list/OutputList";
import { assert } from "chai";
import sinon from "sinon";
import type { Request, Response } from "express";

function createMockResponse(): Response {
  const res = {} as Response;
  res.locals = { defaultProperties: { timestamp: "2024-01-01T00:00:00.000Z", version: "v2" } };
  return res;
}

describe("AvailableDevicesHandlers.ts tests", () => {
  describe("getAvailableDevices", () => {
    let outputList: sinon.SinonStubbedInstance<OutputList>;
    const mockResponse = createMockResponse();

    beforeEach(() => {
      outputList = sinon.createStubInstance(OutputList);
    });

    afterEach(() => {
      sinon.restore();
    });

    it("should return 400 if model is undefined", async () => {
      const mockRequest = {
        app: { get: (_key: string) => outputList },
        params: {},
        query: {},
      } as unknown as Request;

      const error = (await getAvailableDevices(mockRequest, mockResponse)) as any;
      assert.equal(error.statusCode, 400);
      assert.deepEqual(error.error.details, ["Model cannot be undefined."]);
    });

    it("should return 400 if model is not recognized", async () => {
      const mockRequest = {
        app: { get: (_key: string) => outputList },
        params: { model: "NONEXISTENT_MODEL" },
        query: {},
      } as unknown as Request;

      const error = (await getAvailableDevices(mockRequest, mockResponse)) as any;
      assert.equal(error.statusCode, 400);
      assert.isTrue(error.error.details[0].includes("not recognized"));
    });

    it("should return 200 and delegate to outputList.getAvailableDevices", async () => {
      const availableDevices = [
        { alias: null, address: "0x40", pins: ["0"], subcontrollerId: null },
      ];
      outputList.getAvailableDevices.resolves(availableDevices);

      const mockRequest = {
        app: { get: (_key: string) => outputList },
        params: { model: "PCA9685" },
        query: { filterUsed: "true" },
        originalUrl: "/api/v2/outputs/available-devices/PCA9685",
      } as unknown as Request;

      const success = (await getAvailableDevices(mockRequest, mockResponse)) as any;
      assert.equal(success.statusCode, 200);
      assert.deepEqual(success.content.data, availableDevices);
      assert.isTrue(outputList.getAvailableDevices.calledOnceWith("PCA9685", undefined, true));
    });

    it("should pass filterUsed=false when specified", async () => {
      outputList.getAvailableDevices.resolves([]);

      const mockRequest = {
        app: { get: (_key: string) => outputList },
        params: { model: "PCA9685" },
        query: { filterUsed: "false" },
      } as unknown as Request;

      await getAvailableDevices(mockRequest, mockResponse);
      assert.isTrue(outputList.getAvailableDevices.calledOnceWith("PCA9685", undefined, false));
    });

    it("should default filterUsed to true when not specified", async () => {
      outputList.getAvailableDevices.resolves([]);

      const mockRequest = {
        app: { get: (_key: string) => outputList },
        params: { model: "PCA9685" },
        query: {},
      } as unknown as Request;

      await getAvailableDevices(mockRequest, mockResponse);
      assert.isTrue(outputList.getAvailableDevices.calledOnceWith("PCA9685", undefined, true));
    });
  });
});
