import { assert } from "chai";
import sinon from "sinon";
import { OutputBase } from "../../../outputs/base/OutputBase";
import { OutputList } from "../../../outputs/list/OutputList";
import { OutputCondition } from "../OutputCondition";
import type { IOutputConditionsRepository } from "../../../database/repositories/automations/conditions/IOutputConditionsRepository";

describe("OutputCondition.ts tests", () => {
  describe("evaluateNumber", () => {
    it("should return true or false, depending on the condition and comparator", () => {
      const outputCondition = new OutputCondition(1, "allOf", 1, "equal", 50, null);
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

    it("tracks the most recent violation for lookback evaluation", async () => {
      const outputCondition = new OutputCondition(1, "allOf", 1, "greater", 50, 3);
      const outputListMock = sinon.createStubInstance(OutputList);
      const outputMock = sinon.createStubInstance(OutputBase);
      const now = new Date();
      sinon.stub(outputListMock, "outputs").value({ 1: outputMock });
      const repository = {
        getMostRecentViolationAsync: sinon.stub().resolves(new Date(now.getTime() - 60_000)),
      } as Partial<IOutputConditionsRepository> as IOutputConditionsRepository;

      await outputCondition.initializeLookbackStateAsync(repository, now);

      sinon.stub(outputMock, "value").value(51);
      assert.isFalse(outputCondition.evaluate(outputListMock, now));

      const expiredNow = new Date(now.getTime() + 4 * 60000);
      assert.isTrue(outputCondition.evaluate(outputListMock, expiredNow));

      (outputMock.value as number) = 49;
      assert.isFalse(outputCondition.evaluate(outputListMock, expiredNow));
    });
  });
});
