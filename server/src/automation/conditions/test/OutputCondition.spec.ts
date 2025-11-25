import { assert } from "chai";
import sinon from "sinon";
import { OutputBase } from "../../../outputs/base/OutputBase";
import { OutputList } from "../../../outputs/list/OutputList";
import { OutputCondition } from "../OutputCondition";
import { ControlMode } from "@sproot/sproot-common/dist/outputs/IOutputBase";

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

    it("should return the result of the condition for all readings in the lookback period", () => {
      const outputCondition = new OutputCondition(1, "allOf", 1, "greater", 50, 3);
      const outputListMock = sinon.createStubInstance(OutputList);
      const outputMock = sinon.createStubInstance(OutputBase);
      const now = new Date();
      sinon.stub(outputListMock, "outputs").value({ 1: outputMock });

      outputMock.getCachedReadings.returns([
        {
          logTime: now.toISOString(),
          controlMode: ControlMode.automatic,
          value: 51,
        },
        {
          logTime: now.toISOString(),
          controlMode: ControlMode.automatic,
          value: 52,
        },
        {
          logTime: now.toISOString(),
          controlMode: ControlMode.automatic,
          value: 53,
        },
      ]);
      assert.isTrue(outputCondition.evaluate(outputListMock, now));

      // One reading is not greater than comparison value
      outputMock.getCachedReadings.returns([
        {
          logTime: now.toISOString(),
          controlMode: ControlMode.automatic,
          value: 49,
        },
        {
          logTime: now.toISOString(),
          controlMode: ControlMode.automatic,
          value: 52,
        },
        {
          logTime: now.toISOString(),
          controlMode: ControlMode.automatic,
          value: 53,
        },
      ]);
      assert.isFalse(outputCondition.evaluate(outputListMock, now));

      // Not enough readings in the lookback period
      outputMock.getCachedReadings.returns([
        {
          logTime: now.toISOString(),
          controlMode: ControlMode.automatic,
          value: 52,
        },
        {
          logTime: now.toISOString(),
          controlMode: ControlMode.automatic,
          value: 53,
        },
      ]);
      assert.isFalse(outputCondition.evaluate(outputListMock, now));

      // One reading is outside the lookback period
      const oldReading = new Date(now.getTime() - 4 * 60000);
      outputMock.getCachedReadings.returns([
        {
          logTime: oldReading.toISOString(),
          controlMode: ControlMode.automatic,
          value: 51,
        },
        {
          logTime: now.toISOString(),
          controlMode: ControlMode.automatic,
          value: 52,
        },
        {
          logTime: now.toISOString(),
          controlMode: ControlMode.automatic,
          value: 53,
        },
      ]);
      assert.isFalse(outputCondition.evaluate(outputListMock, now));
    });
  });
});
