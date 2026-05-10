import { assert } from "chai";
import sinon from "sinon";
import { Request, Response } from "express";

import { SuccessResponse, ErrorResponse } from "@sproot/sproot-common/dist/api/v2/Responses";
import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";

import {
	deleteSubcontrollerAsync,
	patchSubcontrollerHandlerAsync,
	postSubcontrollerHandlerAsync,
} from "../handlers/SubcontrollerHandlers";
import { setValidatedContractRequestData } from "../../../validation/validateRequest";

describe("SubcontrollerHandlers.ts", () => {
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

	describe("postSubcontrollerHandlerAsync", () => {
		it("should return 201 and add a subcontroller", async () => {
			const sprootDB = sinon.createStubInstance(MockSprootDB);
			sprootDB.addSubcontrollerAsync.resolves(1);
			const mockRequest = {
				app: {
					get: () => sprootDB,
				},
				body: {
					name: "Test Device",
					hostName: "sproot-device-8af4.local",
				},
				originalUrl: "/api/v2/subcontrollers",
			} as unknown as Request;
			const mockResponse = createMockResponse({
				body: {
					name: "Test Device",
					hostName: "sproot-device-8af4.local",
				},
			});

			const success = (await postSubcontrollerHandlerAsync(
				mockRequest,
				mockResponse
			)) as SuccessResponse;

			assert.equal(success.statusCode, 201);
			assert.equal(success.content?.data.id, 1);
			assert.equal(success.content?.data.name, "Test Device");
			assert.equal(success.content?.data.hostName, "sproot-device-8af4.local");
			assert.isTrue(sprootDB.addSubcontrollerAsync.calledOnce);
			assert.isTrue(
				sprootDB.addSubcontrollerAsync.calledWithMatch({
					name: "Test Device",
					hostName: "sproot-device-8af4.local",
					type: "ESP32",
				})
			);
		});

		it("should consume validated subcontroller body instead of raw req.body", async () => {
			const sprootDB = sinon.createStubInstance(MockSprootDB);
			sprootDB.addSubcontrollerAsync.resolves(1);
			const mockRequest = {
				app: {
					get: () => sprootDB,
				},
				body: {
					name: "Ignored Device",
					hostName: "ignored.local",
				},
				originalUrl: "/api/v2/subcontrollers",
			} as unknown as Request;
			const mockResponse = createMockResponse({
				body: {
					name: "Validated Device",
					hostName: "validated.local",
				},
			});

			const success = (await postSubcontrollerHandlerAsync(
				mockRequest,
				mockResponse
			)) as SuccessResponse;

			assert.equal(success.statusCode, 201);
			assert.equal(success.content?.data.name, "Validated Device");
			assert.equal(success.content?.data.hostName, "validated.local");
			assert.isTrue(sprootDB.addSubcontrollerAsync.calledOnce);
			assert.isTrue(
				sprootDB.addSubcontrollerAsync.calledWithMatch({
					name: "Validated Device",
					hostName: "validated.local",
				})
			);
		});

		it("should return 500 when the database write fails", async () => {
			const sprootDB = sinon.createStubInstance(MockSprootDB);
			sprootDB.addSubcontrollerAsync.rejects(new Error("DB Error"));
			const mockRequest = {
				app: {
					get: () => sprootDB,
				},
				body: {
					name: "Test Device",
					hostName: "sproot-device-8af4.local",
				},
				originalUrl: "/api/v2/subcontrollers",
			} as unknown as Request;
			const mockResponse = createMockResponse({
				body: {
					name: "Test Device",
					hostName: "sproot-device-8af4.local",
				},
			});

			const error = (await postSubcontrollerHandlerAsync(mockRequest, mockResponse)) as ErrorResponse;

			assert.equal(error.statusCode, 500);
			assert.equal((error as any).content.error, "Failed to add subcontroller.");
			assert.equal((error as any).content.details, "DB Error");
		});
	});

	describe("patchSubcontrollerHandlerAsync", () => {
		it("should consume validated subcontroller params and body instead of raw Express data", async () => {
			const sprootDB = sinon.createStubInstance(MockSprootDB);
			sprootDB.getSubcontrollersAsync.resolves([
				{ id: 2, name: "Old Device", hostName: "validated.local", type: "ESP32" },
			] as any);
			sprootDB.updateSubcontrollerAsync.resolves();
			const mockRequest = {
				app: {
					get: () => sprootDB,
				},
				params: {
					deviceId: "1",
				},
				body: {
					name: "Ignored Device",
				},
				originalUrl: "/api/v2/subcontrollers/2",
			} as unknown as Request;
			const mockResponse = createMockResponse({
				params: { deviceId: "2" },
				body: { name: "Validated Device" },
			});

			const success = (await patchSubcontrollerHandlerAsync(
				mockRequest,
				mockResponse
			)) as SuccessResponse;

			assert.equal(success.statusCode, 200);
			assert.equal(success.content?.data.id, 2);
			assert.equal(success.content?.data.name, "Validated Device");
			assert.isTrue(sprootDB.updateSubcontrollerAsync.calledOnce);
			assert.isTrue(
				sprootDB.updateSubcontrollerAsync.calledWithMatch({ id: 2, name: "Validated Device" })
			);
		});
	});

	describe("deleteSubcontrollerAsync", () => {
		it("should consume validated subcontroller params instead of raw Express data", async () => {
			const sprootDB = sinon.createStubInstance(MockSprootDB);
			sprootDB.deleteSubcontrollersAsync.resolves(1);
			const sensorList = { regenerateAsync: sinon.stub().resolves() };
			const outputList = { regenerateAsync: sinon.stub().resolves() };
			const mockRequest = {
				app: {
					get: (dependency: string) => {
						switch (dependency) {
							case "sprootDB":
								return sprootDB;
							case "sensorList":
								return sensorList;
							case "outputList":
								return outputList;
							default:
								return undefined;
						}
					},
				},
				params: {
					deviceId: "1",
				},
				originalUrl: "/api/v2/subcontrollers/2",
			} as unknown as Request;
			const mockResponse = createMockResponse({ params: { deviceId: "2" } });

			const success = (await deleteSubcontrollerAsync(mockRequest, mockResponse)) as SuccessResponse;

			assert.equal(success.statusCode, 200);
			assert.equal(success.content?.data, "subcontroller with id 2 deleted successfully.");
			assert.isTrue(sprootDB.deleteSubcontrollersAsync.calledOnceWith(2));
		});
	});
});
