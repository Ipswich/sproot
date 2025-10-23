// import { OutputState } from "@sproot/sproot-server/src/outputs/base/OutputState";
// import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
// import { ControlMode } from "@sproot/sproot-common/dist/outputs/IOutputBase";
// import { SDBOutputState } from "@sproot/sproot-common/dist/database/SDBOutputState";

// import { assert } from "chai";
// import * as sinon from "sinon";

// describe("OutputBase.ts tests", function () {
//   afterEach(() => {
//     sinon.restore();
//   });
//   const mockSprootDB = new MockSprootDB();

//   describe("constructor", function () {
//     it("should create a new OutputState object with default values", function () {
//       const outputState = new OutputState(1, mockSprootDB);

//       assert.equal(outputState.value, 0);
//       assert.equal(outputState.controlMode, ControlMode.automatic);
//     });
//   });

//   describe("updateControlMode", function () {
//     it("should update the control mode of the output state", function () {
//       const outputState = new OutputState(1, mockSprootDB);

//       outputState.updateControlMode(ControlMode.manual);
//       assert.equal(outputState.controlMode, ControlMode.manual);

//       outputState.updateControlMode(ControlMode.automatic);
//       assert.equal(outputState.controlMode, ControlMode.automatic);
//     });
//   });

//   describe("setNewState", function () {
//     it("should update the value of the output state", async function () {
//       const outputState = new OutputState(1, mockSprootDB);
//       const dbStub = sinon.stub(mockSprootDB, "updateLastOutputStateAsync");

//       const newState = { value: 100 } as SDBOutputState;
//       //We're not in manual, should have no effect
//       await outputState.setNewStateAsync({ ...newState, controlMode: ControlMode.manual });
//       assert.equal(outputState.value, 0);
//       dbStub.calledOnceWith({ id: 1, value: 0, controlMode: ControlMode.manual });
//       dbStub.resetHistory();

//       //But we are in automatic, so ... effect.
//       await outputState.setNewStateAsync({ ...newState, controlMode: ControlMode.automatic });
//       assert.equal(outputState.value, 100);
//       dbStub.calledOnceWith({ id: 1, value: 100, controlMode: ControlMode.automatic });
//       dbStub.resetHistory();
//     });
//   });

//   describe("addCurrentStateToDatabaseAsync()", function () {
//     it("should add the current state to the database", async function () {
//       const dbStub = sinon.stub(mockSprootDB, "addOutputStateAsync");
//       const outputState = new OutputState(1, mockSprootDB);

//       //Start in automatic, set automatic value to 100
//       let newState = { value: 100 } as SDBOutputState;
//       await outputState.setNewStateAsync({ ...newState, controlMode: ControlMode.automatic });
//       await outputState.addCurrentStateToDatabaseAsync();
//       dbStub.calledOnceWith({ id: 1, value: 100, controlMode: ControlMode.automatic });
//       dbStub.resetHistory();

//       //Stay in automatic, set automatic value to 0
//       newState = { value: 0 } as SDBOutputState;
//       await outputState.setNewStateAsync({ ...newState, controlMode: ControlMode.automatic });
//       await outputState.addCurrentStateToDatabaseAsync();
//       dbStub.calledOnceWith({ id: 1, value: 0, controlMode: ControlMode.automatic });
//       dbStub.resetHistory();

//       //Stay in automatic, set manual value to 100
//       newState = { value: 100 } as SDBOutputState;
//       await outputState.setNewStateAsync({ ...newState, controlMode: ControlMode.manual });
//       await outputState.addCurrentStateToDatabaseAsync();
//       dbStub.calledOnceWith({ id: 1, value: 0, controlMode: ControlMode.automatic });
//       dbStub.resetHistory();

//       //Swap to manual, value be 100 now
//       outputState.updateControlMode(ControlMode.manual);
//       await outputState.addCurrentStateToDatabaseAsync();
//       dbStub.calledOnceWith({ id: 1, value: 100, controlMode: ControlMode.manual });
//       dbStub.resetHistory();
//     });
//   });
// });
