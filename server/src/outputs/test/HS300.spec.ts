// import { ControlMode } from "@sproot/sproot-common/dist/outputs/IOutputBase";
// import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
// import { HS300, HS300Output } from "../HS300";
// import { SDBOutput } from "@sproot/sproot-common/dist/database/SDBOutput";
// import { SDBOutputState } from "@sproot/sproot-common/dist/database/SDBOutputState";
// import { UdpServer, Device as SimulatedDevice } from "tplink-smarthome-simulator"
// import { Plug } from "tplink-smarthome-api";

// import chai, { assert } from "chai";
// import chaiAsPromised from "chai-as-promised";
// chai.use(chaiAsPromised);
// import * as sinon from "sinon";
// import winston from "winston";
// import { OutputBase } from "../base/OutputBase";
// const mockSprootDB = new MockSprootDB();

// describe("HS300.ts tests", function () {
//   const simulatedHS300 = new SimulatedDevice({
//     model: 'hs300',
//     address: '127.0.0.1',
//     port: 9999,
//     responseDelay: 0,
//   });
//   simulatedHS300.start()
//   UdpServer.start()
//   this.afterAll(() => {
//     simulatedHS300.stop()
//     UdpServer.stop()
//   })
//   afterEach(() => {
//     sinon.restore();
//   });

//   it("should create and delete HS300 outputs", async function () {
//     sinon
//       .stub(winston, "createLogger")
//       .callsFake(() => ({ info: () => { }, error: () => { } }) as unknown as winston.Logger);
//     const logger = winston.createLogger();

//     const hs300 = new HS300(mockSprootDB, 5, 5, 5, 5, logger);
//     const childIds = await hs300.getAvailableChildIds("127.0.0.1");
//     // disposing with nothing shouldn't cause issues
//     hs300.disposeOutput({} as OutputBase);
//     const output1 = await hs300.createOutputAsync({
//       id: 1,
//       model: "hs300",
//       address: "127.0.0.1",
//       name: "test output 1",
//       pin: childIds[0],
//       isPwm: false,
//       isInvertedPwm: false,
//     } as SDBOutput);
//     const output2 = await hs300.createOutputAsync({
//       id: 2,
//       model: "hs300",
//       address: "127.0.0.1",
//       name: "test output 2",
//       pin: childIds[1],
//       isPwm: false,
//       isInvertedPwm: false,
//     } as SDBOutput);
//     const output3 = await hs300.createOutputAsync({
//       id: 3,
//       model: "hs300",
//       address: "127.0.0.1",
//       name: "test output 3",
//       pin: childIds[2],
//       isPwm: false,
//       isInvertedPwm: false,
//     } as SDBOutput);
//     const output4 = await hs300.createOutputAsync({
//       id: 4,
//       model: "hs300",
//       address: "127.0.0.1",
//       name: "test output 4",
//       pin: childIds[3],
//       isPwm: false,
//       isInvertedPwm: false,
//     } as SDBOutput);
//     assert.equal(Object.keys(hs300.outputs).length, 4);
//     assert.exists(hs300.outputs["4"]);
//     assert.equal(hs300.usedPins["127.0.0.1"]!.length, 4);
//     assert.exists(hs300.boardRecord["127.0.0.1"]);
//     console.log(await hs300.getAvailableChildIds("127.0.0.1"))
    
//     // Dispose 1 output
//     hs300.disposeOutput(output4!);
//     assert.equal(Object.keys(hs300.outputs).length, 3);
//     assert.equal(hs300.usedPins["127.0.0.1"]!.length, 3);
//     assert.isUndefined(hs300.outputs["4"]);
//     console.log(await hs300.getAvailableChildIds("127.0.0.1"))

//     // disposing with a non existent pin should also not cause issues
//     hs300.disposeOutput({ pin: "3", address: "127.0.0.1" } as OutputBase);

//     // Dispose the rest
//     hs300.disposeOutput(output1!);
//     hs300.disposeOutput(output2!);
//     hs300.disposeOutput(output3!);
//     assert.equal(Object.keys(hs300.outputs).length, 0);
//     assert.isUndefined(hs300.usedPins["127.0.0.1"]);
//     assert.isUndefined(hs300.boardRecord["127.0.0.1"]);
//   });

//   it("should return output data (no functions)", async function () {
//     sinon
//       .stub(winston, "createLogger")
//       .callsFake(() => ({ info: () => { }, error: () => { } }) as unknown as winston.Logger);
//     const logger = winston.createLogger();

//     const hs300 = new HS300(mockSprootDB, 5, 5, 5, 5, logger);
//     const childIds = await hs300.getAvailableChildIds("127.0.0.1");

//     await hs300.createOutputAsync({
//       id: 1,
//       model: "hs300",
//       address: "127.0.0.1",
//       name: "test output 1",
//       pin: childIds[0],
//       isPwm: false,
//       isInvertedPwm: false,
//     } as SDBOutput);
//     const outputData = hs300.outputData;

//     assert.equal(outputData["1"]!["name"], "test output 1");
//     assert.equal(outputData["1"]!["pin"], childIds[0]);
//     assert.equal(outputData["1"]!["isPwm"], false);
//     assert.equal(outputData["1"]!["isInvertedPwm"], false);
//     assert.exists((hs300.outputs["1"]! as HS300Output)["hs300"]);
//     assert.exists(hs300.outputs["1"]!["sprootDB"]);
//   });

//   it("should update and apply states with respect to control mode", async function () {
//     sinon
//       .stub(winston, "createLogger")
//       .callsFake(
//         () => ({ info: () => { }, error: () => { }, verbose: () => { } }) as unknown as winston.Logger,
//       );
//     const logger = winston.createLogger();

//     const setStateStub = sinon.stub(Plug.prototype, "setPowerState").resolves();
//     const hs300 = new HS300(mockSprootDB, 5, 5, 5, 5, logger);
//     const childIds = await hs300.getAvailableChildIds("127.0.0.1");
//     await hs300.createOutputAsync({
//       id: 1,
//       model: "hs300",
//       name: "test output 1",
//       pin: childIds[0],
//       isPwm: false,
//       isInvertedPwm: false,
//     } as SDBOutput);

//     //Automatic High
//     hs300.setNewOutputState(
//       "1",
//       <SDBOutputState>{ value: 100, logTime: new Date().toISOString() },
//       ControlMode.automatic,
//     );
//     assert.equal(hs300.outputs["1"]?.state.automatic.value, 100);
//     hs300.executeOutputState();
//     assert.equal(setStateStub.callCount, 1);
//     assert.equal(setStateStub.getCall(0).args[0], true);

//     //Automatic Low
//     hs300.setNewOutputState(
//       "1",
//       <SDBOutputState>{ value: 0, logTime: new Date().toISOString() },
//       ControlMode.automatic,
//     );
//     assert.equal(hs300.outputs["1"]?.state.automatic.value, 0);
//     hs300.executeOutputState();
//     assert.equal(setStateStub.callCount, 2);
//     assert.equal(setStateStub.getCall(1).args[0], false);

//     //Swap to Manual
//     hs300.updateControlMode("1", ControlMode.manual);

//     //Manual Low
//     hs300.setNewOutputState(
//       "1",
//       <SDBOutputState>{ value: 0, logTime: new Date().toISOString() },
//       ControlMode.manual,
//     );
//     assert.equal(hs300.outputs["1"]?.state.manual.value, 0);
//     hs300.executeOutputState();
//     assert.equal(setStateStub.callCount, 3);
//     assert.equal(setStateStub.getCall(2).args[0], false);

//     //Manual High
//     hs300.setNewOutputState(
//       "1",
//       <SDBOutputState>{ value: 100, logTime: new Date().toISOString() },
//       ControlMode.manual,
//     );
//     assert.equal(hs300.outputs["1"]?.state.manual.value, 100);
//     hs300.executeOutputState();
//     assert.equal(setStateStub.callCount, 4);
//     assert.equal(setStateStub.getCall(3).args[0], true);

//     //Swap to Automatic
//     hs300.updateControlMode("1", ControlMode.automatic);

//     //Execute Automatic Low
//     hs300.executeOutputState();
//     assert.equal(setStateStub.callCount, 5);
//     assert.equal(setStateStub.getCall(4).args[0], false);

//     //Inverted PWM Execution
//     await hs300.createOutputAsync({
//       id: 1,
//       model: "hs300",
//       name: "test output 1",
//       pin: childIds[0],
//       isPwm: true,
//       isInvertedPwm: true,
//     } as SDBOutput);

//     hs300.setNewOutputState("1", <SDBOutputState>{ value: 100 }, ControlMode.automatic);
//     assert.equal(hs300.outputs["1"]?.state.automatic.value, 100);
//     hs300.executeOutputState("1"); //Receives individual output id as well.
//     assert.equal(setStateStub.callCount, 6);
//     assert.equal(setStateStub.getCall(5).args[0], false);

//     //PWM error handling
//     hs300.setNewOutputState("1", <SDBOutputState>{ value: -1 }, ControlMode.automatic);
//     hs300.executeOutputState("1"); //Receives individual output id as well.
//     assert.equal(hs300.outputs["1"]?.state.automatic.value, 0);
//     assert.equal(setStateStub.callCount, 7);

//     hs300.setNewOutputState("1", <SDBOutputState>{ value: 101 }, ControlMode.automatic);
//     hs300.executeOutputState("1"); //Receives individual output id as well.
//     assert.equal(hs300.outputs["1"]?.state.automatic.value, 100);
//     assert.equal(setStateStub.callCount, 8);

//     //Non-PWM error handling
//     await hs300.createOutputAsync({
//       id: 2,
//       model: "hs300",
//       name: "test output 1",
//       pin: childIds[0],
//       isPwm: false,
//       isInvertedPwm: false,
//     } as SDBOutput);

//     //Execute non-pwm output (not 0 or 100)
//     hs300.setNewOutputState("2", <SDBOutputState>{ value: 75 }, ControlMode.automatic);
//     hs300.executeOutputState("2");
//     assert.equal(setStateStub.callCount, 8);
//   });
// });
