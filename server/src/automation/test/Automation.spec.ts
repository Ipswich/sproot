import { Automation } from "../Automation";
import { assert } from "chai";
import sinon from "sinon";
import { SensorList } from "../../sensors/list/SensorList";
import { OutputList } from "../../outputs/list/OutputList";
// import { Conditions } from "../conditions/Conditions";
import { SprootDB } from "../../database/SprootDB";

describe("Automation.ts tests", () => {
  describe("evaluate", () => {
    it("should return the automation's value (conditions met)", async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      const automation = new Automation(1, "test", 75, "or", sprootDB);
      const sensorListMock = sinon.createStubInstance(SensorList);
      const outputListMock = sinon.createStubInstance(OutputList);
      
      //No conditions, should be null
      assert.isNull(automation.evaluate(sensorListMock, outputListMock, new Date()));
      
      //Add a condition
      sprootDB.addTimeAutomationConditionAsync.resolves(1);
      await automation.conditions.addTimeConditionAsync("allOf", null, null);
      assert.equal(automation.evaluate(sensorListMock, outputListMock, new Date()), 75);
    });

    it("should return null (conditions not met)", () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      const automation = new Automation(1, "test", 75, "or", sprootDB);
      const sensorListMock = sinon.createStubInstance(SensorList);
      const outputListMock = sinon.createStubInstance(OutputList);
      const now = new Date();
      now.setHours(12);
      
      //Add a condition
      sprootDB.addTimeAutomationConditionAsync.resolves(1);
      automation.conditions.addTimeConditionAsync("allOf", "13:00", null);
      assert.isNull(automation.evaluate(sensorListMock, outputListMock, now));
    })
  });
});
