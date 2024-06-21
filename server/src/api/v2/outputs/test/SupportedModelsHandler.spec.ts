import { Response } from "express";
import supportedModelsHandler from "../handlers/SupportedModelsHandler";
import ModelList from "../../../../outputs/ModelList";

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

    assert.deepEqual(supportedModelsResponse.content?.data, Object.values(ModelList));
    assert.equal((supportedModelsResponse.content?.data as Array<string>).length, 1);
  });
});
