import { Request, Response } from "express";
import { assert } from "chai";
import sinon from "sinon";

import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { OutputList } from "../../../../outputs/list/OutputList";
import { getAvailableDevices } from "../handlers/AvailableDevicesHandlers";
import { setValidatedContractRequestData } from "../../../validation/validateRequest";

describe("AvailableDevicesHandlers.ts", () => {
	function createMockResponse(validatedRequestData: Record<string, unknown> = {}): Response {
		const response = {
			locals: {
				defaultProperties: {
					timestamp: new Date().toISOString(),
					requestId: "1234",
				},
			},
		} as unknown as Response;

		setValidatedContractRequestData(response, validatedRequestData);

		return response;
	}

	afterEach(() => {
		sinon.restore();
	});

	it("should consume validated available-device params and query instead of raw Express data", async () => {
		const outputList = sinon.createStubInstance(OutputList);
		outputList.getAvailableDevices.returns([
			{ alias: "Validated Plug", address: "validated-host", externalId: "child-1" },
		]);

		const mockRequest = {
			app: {
				get: () => outputList,
			},
			params: {
				model: "PCA9685",
			},
			query: {
				address: "raw-host",
				filterUsed: true,
			},
			originalUrl: "/api/v2/outputs/available-devices/TPLINK_SMART_PLUG",
		} as unknown as Request;
		const mockResponse = createMockResponse({
			params: { model: "TPLINK_SMART_PLUG" },
			query: { address: "validated-host", filterUsed: false },
		});

		const success = (await getAvailableDevices(mockRequest, mockResponse)) as SuccessResponse;

		assert.equal(success.statusCode, 200);
		assert.deepEqual(success.content?.data, [
			{ alias: "Validated Plug", address: "validated-host", externalId: "child-1" },
		]);
		assert.isTrue(
			outputList.getAvailableDevices.calledOnceWith("TPLINK_SMART_PLUG", "validated-host", false)
		);
	});

	it("should keep unrecognized-model validation in the handler", async () => {
		const outputList = sinon.createStubInstance(OutputList);
		const mockRequest = {
			app: {
				get: () => outputList,
			},
			params: {
				model: "PCA9685",
			},
			query: {},
			originalUrl: "/api/v2/outputs/available-devices/INVALID_MODEL",
		} as unknown as Request;
		const mockResponse = createMockResponse({ params: { model: "INVALID_MODEL" } });

		const error = (await getAvailableDevices(mockRequest, mockResponse)) as ErrorResponse;

		assert.equal(error.statusCode, 400);
		assert.equal(error.error?.name, "Bad Request");
		assert.include(error.error?.details?.[0] ?? "", "Model 'INVALID_MODEL' not recognized");
	});
});
