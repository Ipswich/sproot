import supportedModelsHandler from "../handlers/SupportedModelsHandler";
import ModelList from "../../../../sensors/ModelList";

import { assert } from "chai";

describe("SupportedModelsHandler.ts tests", () => {
  it("should return an array of supported models", () => {
    const models = supportedModelsHandler();
    assert.deepEqual(models, Object.values(ModelList));
    assert.equal(models.length, 2);
  });
});
