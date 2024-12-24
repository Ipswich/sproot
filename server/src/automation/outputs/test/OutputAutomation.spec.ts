import { OutputAutomation } from "../OutputAutomation";
import { assert } from "chai";
import sinon from "sinon";
import { SensorList } from "../../../sensors/list/SensorList";
import { OutputList } from "../../../outputs/list/OutputList";
import { SDBTimeCondition } from "@sproot/database/SDBTimeCondition";
import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";

describe("Automation.ts tests", () => {
  describe("evaluate", () => {
    it("should return the automation's value (conditions met)", async () => {
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      const automation = new OutputAutomation(1, "test", 75, "or", sprootDB);
      const sensorListMock = sinon.createStubInstance(SensorList);
      const outputListMock = sinon.createStubInstance(OutputList);

      //No conditions, should be null
      assert.isNull(automation.evaluate(sensorListMock, outputListMock, new Date()));

      //Add a condition
      sprootDB.getSensorConditionsAsync.resolves([]);
      sprootDB.getOutputConditionsAsync.resolves([]);
      sprootDB.getTimeConditionsAsync.resolves([
        {
          id: 1,
          automationId: 1,
          groupType: "allOf",
          startTime: null,
          endTime: null,
        } as SDBTimeCondition,
      ]);
      await automation.conditions.loadAsync();
      assert.equal(automation.evaluate(sensorListMock, outputListMock, new Date()), 75);
    });

    it("should return null (conditions not met)", () => {
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      const automation = new OutputAutomation(1, "test", 75, "or", sprootDB);
      const sensorListMock = sinon.createStubInstance(SensorList);
      const outputListMock = sinon.createStubInstance(OutputList);
      const now = new Date();
      now.setHours(12);

      //Add a condition
      sprootDB.addTimeConditionAsync.resolves(1);
      sprootDB.getSensorConditionsAsync.resolves([]);
      sprootDB.getOutputConditionsAsync.resolves([]);
      sprootDB.getTimeConditionsAsync.resolves([
        {
          id: 1,
          automationId: 1,
          groupType: "allOf",
          startTime: "13:00",
          endTime: null,
        } as SDBTimeCondition,
        {
          id: 2,
          automationId: 1,
          groupType: "allOf",
          startTime: "12:00",
          endTime: null,
        } as SDBTimeCondition,
      ]);
      assert.isNull(automation.evaluate(sensorListMock, outputListMock, now));
    });
  });
});
