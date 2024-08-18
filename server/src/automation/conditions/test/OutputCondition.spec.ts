import { OutputCondition } from "../OutputCondition";
import { OutputList } from "../../../outputs/list/OutputList";

import { assert } from "chai";
import sinon from "sinon";
import { OutputBase } from "../../../outputs/base/OutputBase";

describe("OutputCondition.ts tests", () => {
  describe("evaluateNumber", () => {
    it("should return true or false, depending on the condition and comparator", () => {
      const outputCondition = new OutputCondition(1, "equal", 50);
      const outputListMock = sinon.createStubInstance(OutputList);
      const outputMock = sinon.createStubInstance(OutputBase);
      sinon.stub(outputListMock, "outputs").value({ 1: outputMock });

      const valueStub = sinon.stub(outputMock, "value").value(51);
      assert.isFalse(outputCondition.evaluate(outputListMock));
      valueStub.value(50);
      assert.isTrue(outputCondition.evaluate(outputListMock));

      outputCondition.operator = "notEqual";
      assert.isFalse(outputCondition.evaluate(outputListMock));
      valueStub.value(51);
      assert.isTrue(outputCondition.evaluate(outputListMock));

      outputCondition.operator = "greaterOrEqual";
      valueStub.value(50);
      assert.isTrue(outputCondition.evaluate(outputListMock));
      valueStub.value(51);
      assert.isTrue(outputCondition.evaluate(outputListMock));

      outputCondition.operator = "greater";
      valueStub.value(50);
      assert.isFalse(outputCondition.evaluate(outputListMock));
      valueStub.value(51);
      assert.isTrue(outputCondition.evaluate(outputListMock));

      outputCondition.operator = "lessOrEqual";
      valueStub.value(50);
      assert.isTrue(outputCondition.evaluate(outputListMock));
      valueStub.value(49);
      assert.isTrue(outputCondition.evaluate(outputListMock));

      outputCondition.operator = "less";
      valueStub.value(50);
      assert.isFalse(outputCondition.evaluate(outputListMock));
      valueStub.value(49);
      assert.isTrue(outputCondition.evaluate(outputListMock));
    });
  });
});
