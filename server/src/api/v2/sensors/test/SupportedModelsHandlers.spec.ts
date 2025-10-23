import { Response } from "express";

import { supportedModelsHandler } from "../handlers/SupportedModelsHandlers";
import { ModelList } from "@sproot/sproot-common/src/sensors/Models";

import { assert } from "chai";

describe("SupportedModelsHandler.ts tests", () => {
  it("should return a 200 and an array of supported models", () => {
    const mockResponse = {
      locals: {
        defaultProperties: {
          statusCode: 200,
          requestId: "1234",
        },
      },
    } as unknown as Response;

    const supportedModelsResponse = supportedModelsHandler(mockResponse);

    assert.deepEqual(supportedModelsResponse.content?.data, ModelList);
    assert.equal(Object.keys(supportedModelsResponse.content?.data).length, 4);
  });
});
