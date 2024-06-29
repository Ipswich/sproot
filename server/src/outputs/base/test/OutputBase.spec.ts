import { OutputState } from "@sproot/sproot-server/src/outputs/base/OutputState";
import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { ControlMode } from "@sproot/sproot-common/dist/outputs/IOutputBase";
import { SDBOutputState } from "@sproot/sproot-common/dist/database/SDBOutputState";

import { assert } from "chai";
import * as sinon from "sinon";

describe("OutputBase.ts tests", function () {
  afterEach(() => {
    sinon.restore();
  });
  const mockSprootDB = new MockSprootDB();

  describe("constructor", function () {
    it("should create a new OutputState object with default values", function () {
      const outputState = new OutputState(mockSprootDB);

      assert.equal(outputState.value, 0);
      assert.equal(outputState.controlMode, ControlMode.schedule);
    });
  });

  describe("updateControlMode", function () {
    it("should update the control mode of the output state", function () {
      const outputState = new OutputState(mockSprootDB);

      outputState.updateControlMode(ControlMode.manual);
      assert.equal(outputState.controlMode, ControlMode.manual);

      outputState.updateControlMode(ControlMode.schedule);
      assert.equal(outputState.controlMode, ControlMode.schedule);
    });
  });

  describe("setNewState", function () {
    it("should update the value of the output state", function () {
      const outputState = new OutputState(mockSprootDB);

      const newState = { value: 100 } as SDBOutputState;
      //We're not in manual, should have no effect
      outputState.setNewState(newState, ControlMode.manual);
      assert.equal(outputState.value, 0);

      //But we are in schedule, so ... effect.
      outputState.setNewState(newState, ControlMode.schedule);
      assert.equal(outputState.value, 100);
    });
  });

  describe("addCurrentStateToDatabaseAsync()", function () {
    it("should add the current state to the database", async function () {
      const dbStub = sinon.stub(mockSprootDB, "addOutputStateAsync");
      const outputState = new OutputState(mockSprootDB);

      //Start in schedule, set schedule value to 100
      let newState = { value: 100 } as SDBOutputState;
      outputState.setNewState({ value: 100 } as SDBOutputState, ControlMode.schedule);
      await outputState.addCurrentStateToDatabaseAsync(1);
      dbStub.calledOnceWith({ id: 1, value: 100, controlMode: ControlMode.schedule });
      dbStub.resetHistory();

      //Stay in schedule, set schedule value to 0
      newState = { value: 0 } as SDBOutputState;
      outputState.setNewState(newState, ControlMode.schedule);
      await outputState.addCurrentStateToDatabaseAsync(1);
      dbStub.calledOnceWith({ id: 1, value: 0, controlMode: ControlMode.schedule });
      dbStub.resetHistory();

      //Stay in schedule, set manual value to 100
      newState = { value: 100 } as SDBOutputState;
      outputState.setNewState(newState, ControlMode.manual);
      await outputState.addCurrentStateToDatabaseAsync(1);
      dbStub.calledOnceWith({ id: 1, value: 0, controlMode: ControlMode.schedule });
      dbStub.resetHistory();

      //Swap to manual, value be 100 now
      outputState.updateControlMode(ControlMode.manual);
      await outputState.addCurrentStateToDatabaseAsync(1);
      dbStub.calledOnceWith({ id: 1, value: 100, controlMode: ControlMode.manual });
      dbStub.resetHistory();
    });
  });
});
