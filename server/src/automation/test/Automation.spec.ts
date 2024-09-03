// import { Automation, AutomationConditions, isBetweenTimeStamp } from "../Automation";
// import { SensorList } from "../../sensors/list/SensorList";
// import { SensorBase } from "../../sensors/base/SensorBase";
// import { ReadingType } from "@sproot/sproot-common/dist/sensors/ReadingType";
// import { OutputList } from "../../outputs/list/OutputList";
// import { OutputBase } from "../../outputs/base/OutputBase";
// import { SensorCondition } from "../conditions/SensorCondition";
// import { OutputCondition } from "../conditions/OutputCondition";

// import { assert } from "chai";
// import sinon from "sinon";

// describe("Automation.ts tests", () => {
//   describe("Automation", () => {
//     describe("'constant' automations", () => {
//       it("should handle an automation without conditions", () => {
//         const sensorListMock = sinon.createStubInstance(SensorList);
//         const outputListMock = sinon.createStubInstance(OutputList);
//         const conditions = new AutomationConditions("or", [], [], []);

//         const automation = new Automation(1, "test", 50, conditions);
//         const now = new Date();

//         now.setHours(10, 59);
//         assert.equal(automation.evaluate(now, sensorListMock, outputListMock), 50);
//         now.setHours(11, 0);
//         assert.equal(automation.evaluate(now, sensorListMock, outputListMock), 50);
//         now.setHours(11, 1);
//         assert.equal(automation.evaluate(now, sensorListMock, outputListMock), 50);
//       });

//       it("should handle an automation with conditions", () => {
//         // Create a simple sensorList
//         const sensorListMock = sinon.createStubInstance(SensorList);
//         const sensorMock1 = sinon.createStubInstance(SensorBase);
//         const sensorMock2 = sinon.createStubInstance(SensorBase);
//         sinon.stub(sensorListMock, "sensors").value({ 1: sensorMock1, 2: sensorMock2 });
//         sensorMock1.lastReading = { temperature: "51", humidity: "49", pressure: "51" };
//         sensorMock2.lastReading = { temperature: "70", humidity: "49", pressure: "51" };

//         // Create a simple OutputList
//         const outputListMock = sinon.createStubInstance(OutputList);
//         const outputMock = sinon.createStubInstance(OutputBase);
//         sinon.stub(outputListMock, "outputs").value({ 1: outputMock });
//         sinon.stub(outputMock, "value").value(51);

//         let conditions = new AutomationConditions(
//           "or",
//           [
//             new SensorCondition(1, 1, ReadingType.temperature, "greater", 50),
//             new OutputCondition(1, 1, "greater", 50),
//           ],
//           [],
//           [],
//         );

//         let automation = new Automation(1, "test", 50, conditions);
//         const early = new Date();
//         early.setHours(0, 0);
//         const late = new Date();
//         late.setHours(12, 0);

//         // OR
//         // two true allOfs
//         assert.equal(automation.evaluate(early, sensorListMock, outputListMock), 50);
//         assert.equal(automation.evaluate(early, sensorListMock, outputListMock), 50);

//         // make one of those allofs false
//         conditions.allOf[1]!.operator = "equal";
//         assert.isNull(automation.evaluate(early, sensorListMock, outputListMock));
//         assert.isNull(automation.evaluate(late, sensorListMock, outputListMock));

//         // add a true any
//         conditions.anyOf = [new SensorCondition(2, 2, ReadingType.temperature, "less", 80)];
//         assert.equal(automation.evaluate(early, sensorListMock, outputListMock), 50);
//         assert.equal(automation.evaluate(early, sensorListMock, outputListMock), 50);

//         // move that any to a oneOf
//         conditions.anyOf = [];
//         assert.isNull(automation.evaluate(early, sensorListMock, outputListMock));
//         assert.isNull(automation.evaluate(late, sensorListMock, outputListMock));
//         conditions.oneOf = [new SensorCondition(2, 2, ReadingType.temperature, "less", 80)];
//         assert.equal(automation.evaluate(early, sensorListMock, outputListMock), 50);
//         assert.equal(automation.evaluate(early, sensorListMock, outputListMock), 50);

//         // add a false oneOf
//         conditions.oneOf.push(new OutputCondition(2, 1, "less", 10));
//         assert.equal(automation.evaluate(early, sensorListMock, outputListMock), 50);
//         assert.equal(automation.evaluate(early, sensorListMock, outputListMock), 50);

//         // add another true oneOf
//         conditions.oneOf.push(new OutputCondition(3, 1, "lessOrEqual", 51));
//         assert.isNull(automation.evaluate(early, sensorListMock, outputListMock));
//         assert.isNull(automation.evaluate(late, sensorListMock, outputListMock));

//         //yeet allOfs
//         conditions.allOf = [];
//         assert.isNull(automation.evaluate(early, sensorListMock, outputListMock));
//         assert.isNull(automation.evaluate(late, sensorListMock, outputListMock));

//         //AND (reset)
//         conditions = new AutomationConditions(
//           "and",
//           [
//             new SensorCondition(1, 1, ReadingType.temperature, "greater", 50),
//             new OutputCondition(1, 1, "greater", 50),
//           ],
//           [],
//           [],
//         );
//         automation = new Automation(1, "test", 50, conditions);

//         // two true allOfs
//         assert.equal(automation.evaluate(early, sensorListMock, outputListMock), 50);
//         assert.equal(automation.evaluate(early, sensorListMock, outputListMock), 50);

//         // add a false anyOf
//         conditions.anyOf.push(
//           new SensorCondition(2, 1, ReadingType.temperature, "greaterOrEqual", 100),
//         );
//         assert.isNull(automation.evaluate(early, sensorListMock, outputListMock));
//         assert.isNull(automation.evaluate(late, sensorListMock, outputListMock));
//         // make it a true anyOf
//         conditions.anyOf[0]!.operator = "notEqual";
//         assert.equal(automation.evaluate(early, sensorListMock, outputListMock), 50);
//         assert.equal(automation.evaluate(early, sensorListMock, outputListMock), 50);

//         //add a false oneOf
//         conditions.oneOf.push(new OutputCondition(1, 1, "less", 10));
//         assert.isNull(automation.evaluate(early, sensorListMock, outputListMock));
//         assert.isNull(automation.evaluate(late, sensorListMock, outputListMock));
//         //make it a true oneOf
//         conditions.oneOf[0]!.operator = "greaterOrEqual";
//         assert.equal(automation.evaluate(early, sensorListMock, outputListMock), 50);
//         assert.equal(automation.evaluate(early, sensorListMock, outputListMock), 50);
//         // add a second true oneOf
//         conditions.oneOf.push(new OutputCondition(1, 1, "notEqual", 10));
//         assert.isNull(automation.evaluate(early, sensorListMock, outputListMock));
//         assert.isNull(automation.evaluate(late, sensorListMock, outputListMock));
//       });
//     });

//     describe("'bounded' automations", () => {
//       it("should handle an automation without conditions", () => {
//         const sensorListMock = sinon.createStubInstance(SensorList);
//         const outputListMock = sinon.createStubInstance(OutputList);
//         const conditions = new AutomationConditions("or", [], [], []);

//         const automation = new Automation(1, "test", 50, conditions, "11:00", "2:00");
//         const now = new Date();

//         //Before start
//         now.setHours(10, 59);
//         assert.isNull(automation.evaluate(now, sensorListMock, outputListMock));
//         //Include start
//         now.setHours(11, 0);
//         assert.equal(automation.evaluate(now, sensorListMock, outputListMock), 50);
//         //Middle of timeframe
//         now.setHours(18, 30);
//         assert.equal(automation.evaluate(now, sensorListMock, outputListMock), 50);
//         //Exclude end
//         now.setHours(2, 0);
//         assert.isNull(automation.evaluate(now, sensorListMock, outputListMock));
//       });

//       it("should handle an automation with conditions", () => {
//         // Create a simple sensorList
//         const sensorListMock = sinon.createStubInstance(SensorList);
//         const sensorMock1 = sinon.createStubInstance(SensorBase);
//         const sensorMock2 = sinon.createStubInstance(SensorBase);
//         sinon.stub(sensorListMock, "sensors").value({ 1: sensorMock1, 2: sensorMock2 });
//         sensorMock1.lastReading = { temperature: "51", humidity: "49", pressure: "51" };
//         sensorMock2.lastReading = { temperature: "70", humidity: "49", pressure: "51" };

//         // Create a simple OutputList
//         const outputListMock = sinon.createStubInstance(OutputList);
//         const outputMock = sinon.createStubInstance(OutputBase);
//         sinon.stub(outputListMock, "outputs").value({ 1: outputMock });
//         sinon.stub(outputMock, "value").value(51);

//         let conditions = new AutomationConditions(
//           "or",
//           [
//             new SensorCondition(1, 1, ReadingType.temperature, "greater", 50),
//             new OutputCondition(1, 1, "greater", 50),
//           ],
//           [],
//           [],
//         );

//         let automation = new Automation(1, "test", 50, conditions, "11:00", "2:00");
//         const early = new Date();
//         early.setHours(10, 59);
//         const start = new Date();
//         start.setHours(11, 0);
//         const middle = new Date();
//         middle.setHours(18, 30);
//         const late = new Date();
//         late.setHours(2, 0);

//         // OR
//         // two true allOfs
//         assert.isNull(automation.evaluate(early, sensorListMock, outputListMock));
//         assert.equal(automation.evaluate(start, sensorListMock, outputListMock), 50);
//         assert.equal(automation.evaluate(middle, sensorListMock, outputListMock), 50);
//         assert.isNull(automation.evaluate(late, sensorListMock, outputListMock));

//         // make one of those allofs false
//         conditions.allOf[1]!.operator = "equal";
//         assert.isNull(automation.evaluate(early, sensorListMock, outputListMock));
//         assert.isNull(automation.evaluate(start, sensorListMock, outputListMock));
//         assert.isNull(automation.evaluate(middle, sensorListMock, outputListMock));
//         assert.isNull(automation.evaluate(late, sensorListMock, outputListMock));

//         // add a true any
//         conditions.anyOf = [new SensorCondition(2, 2, ReadingType.temperature, "less", 80)];
//         assert.isNull(automation.evaluate(early, sensorListMock, outputListMock));
//         assert.equal(automation.evaluate(start, sensorListMock, outputListMock), 50);
//         assert.equal(automation.evaluate(middle, sensorListMock, outputListMock), 50);
//         assert.isNull(automation.evaluate(late, sensorListMock, outputListMock));

//         // move that any to a oneOf
//         conditions.anyOf = [];
//         assert.isNull(automation.evaluate(early, sensorListMock, outputListMock));
//         assert.isNull(automation.evaluate(start, sensorListMock, outputListMock));
//         assert.isNull(automation.evaluate(middle, sensorListMock, outputListMock));
//         assert.isNull(automation.evaluate(late, sensorListMock, outputListMock));
//         conditions.oneOf = [new SensorCondition(2, 2, ReadingType.temperature, "less", 80)];
//         assert.isNull(automation.evaluate(early, sensorListMock, outputListMock));
//         assert.equal(automation.evaluate(start, sensorListMock, outputListMock), 50);
//         assert.equal(automation.evaluate(middle, sensorListMock, outputListMock), 50);
//         assert.isNull(automation.evaluate(late, sensorListMock, outputListMock));

//         // add a false oneOf
//         conditions.oneOf.push(new OutputCondition(2, 1, "less", 10));
//         assert.isNull(automation.evaluate(early, sensorListMock, outputListMock));
//         assert.equal(automation.evaluate(start, sensorListMock, outputListMock), 50);
//         assert.equal(automation.evaluate(middle, sensorListMock, outputListMock), 50);
//         assert.isNull(automation.evaluate(late, sensorListMock, outputListMock));

//         // add another true oneOf
//         conditions.oneOf.push(new OutputCondition(3, 1, "lessOrEqual", 51));
//         assert.isNull(automation.evaluate(early, sensorListMock, outputListMock));
//         assert.isNull(automation.evaluate(start, sensorListMock, outputListMock));
//         assert.isNull(automation.evaluate(middle, sensorListMock, outputListMock));
//         assert.isNull(automation.evaluate(late, sensorListMock, outputListMock));

//         //yeet allOfs
//         conditions.allOf = [];
//         assert.isNull(automation.evaluate(early, sensorListMock, outputListMock));
//         assert.isNull(automation.evaluate(start, sensorListMock, outputListMock));
//         assert.isNull(automation.evaluate(middle, sensorListMock, outputListMock));
//         assert.isNull(automation.evaluate(late, sensorListMock, outputListMock));

//         //AND (reset)
//         conditions = new AutomationConditions(
//           "and",
//           [
//             new SensorCondition(1, 1, ReadingType.temperature, "greater", 50),
//             new OutputCondition(1, 1, "greater", 50),
//           ],
//           [],
//           [],
//         );
//         automation = new Automation(1, "test", 50, conditions, "11:00", "2:00");

//         // two true allOfs
//         assert.isNull(automation.evaluate(early, sensorListMock, outputListMock));
//         assert.equal(automation.evaluate(start, sensorListMock, outputListMock), 50);
//         assert.equal(automation.evaluate(middle, sensorListMock, outputListMock), 50);
//         assert.isNull(automation.evaluate(late, sensorListMock, outputListMock));

//         // add a false anyOf
//         conditions.anyOf.push(
//           new SensorCondition(2, 1, ReadingType.temperature, "greaterOrEqual", 100),
//         );
//         assert.isNull(automation.evaluate(early, sensorListMock, outputListMock));
//         assert.isNull(automation.evaluate(start, sensorListMock, outputListMock));
//         assert.isNull(automation.evaluate(middle, sensorListMock, outputListMock));
//         assert.isNull(automation.evaluate(late, sensorListMock, outputListMock));
//         // make it a true anyOf
//         conditions.anyOf[0]!.operator = "notEqual";
//         assert.isNull(automation.evaluate(early, sensorListMock, outputListMock));
//         assert.equal(automation.evaluate(start, sensorListMock, outputListMock), 50);
//         assert.equal(automation.evaluate(middle, sensorListMock, outputListMock), 50);
//         assert.isNull(automation.evaluate(late, sensorListMock, outputListMock));

//         //add a false oneOf
//         conditions.oneOf.push(new OutputCondition(2, 1, "less", 10));
//         assert.isNull(automation.evaluate(early, sensorListMock, outputListMock));
//         assert.isNull(automation.evaluate(start, sensorListMock, outputListMock));
//         assert.isNull(automation.evaluate(middle, sensorListMock, outputListMock));
//         assert.isNull(automation.evaluate(late, sensorListMock, outputListMock));
//         //make it a true oneOf
//         conditions.oneOf[0]!.operator = "greaterOrEqual";
//         assert.isNull(automation.evaluate(early, sensorListMock, outputListMock));
//         assert.equal(automation.evaluate(start, sensorListMock, outputListMock), 50);
//         assert.equal(automation.evaluate(middle, sensorListMock, outputListMock), 50);
//         assert.isNull(automation.evaluate(late, sensorListMock, outputListMock));
//         // add a second true oneOf
//         conditions.oneOf.push(new OutputCondition(3, 1, "notEqual", 10));
//         assert.isNull(automation.evaluate(early, sensorListMock, outputListMock));
//         assert.isNull(automation.evaluate(start, sensorListMock, outputListMock));
//         assert.isNull(automation.evaluate(middle, sensorListMock, outputListMock));
//         assert.isNull(automation.evaluate(late, sensorListMock, outputListMock));
//       });
//     });
//     describe("'now' automations", () => {
//       it("should handle an automation without conditions", () => {
//         const sensorListMock = sinon.createStubInstance(SensorList);
//         const outputListMock = sinon.createStubInstance(OutputList);
//         const conditions = new AutomationConditions("or", [], [], []);

//         const automation = new Automation(1, "test", 50, conditions, "11:00");
//         const now = new Date();

//         now.setHours(10, 59);
//         assert.isNull(automation.evaluate(now, sensorListMock, outputListMock));
//         now.setHours(11, 0);
//         assert.equal(automation.evaluate(now, sensorListMock, outputListMock), 50);
//         now.setHours(11, 1);
//         assert.isNull(automation.evaluate(now, sensorListMock, outputListMock));
//       });

//       it("should handle an automation with conditions", () => {
//         // Create a simple sensorList
//         const sensorListMock = sinon.createStubInstance(SensorList);
//         const sensorMock1 = sinon.createStubInstance(SensorBase);
//         const sensorMock2 = sinon.createStubInstance(SensorBase);
//         sinon.stub(sensorListMock, "sensors").value({ 1: sensorMock1, 2: sensorMock2 });
//         sensorMock1.lastReading = { temperature: "51", humidity: "49", pressure: "51" };
//         sensorMock2.lastReading = { temperature: "70", humidity: "49", pressure: "51" };

//         // Create a simple OutputList
//         const outputListMock = sinon.createStubInstance(OutputList);
//         const outputMock = sinon.createStubInstance(OutputBase);
//         sinon.stub(outputListMock, "outputs").value({ 1: outputMock });
//         sinon.stub(outputMock, "value").value(51);

//         let conditions = new AutomationConditions(
//           "or",
//           [
//             new SensorCondition(1, 1, ReadingType.temperature, "greater", 50),
//             new OutputCondition(1, 1, "greater", 50),
//           ],
//           [],
//           [],
//         );

//         let automation = new Automation(1, "test", 50, conditions, "11:00");
//         const now = new Date();

//         // OR
//         // two true allOfs
//         now.setHours(10, 59);
//         assert.isNull(automation.evaluate(now, sensorListMock, outputListMock));
//         now.setHours(11, 0);
//         assert.equal(automation.evaluate(now, sensorListMock, outputListMock), 50);

//         // make one of those allofs false
//         conditions.allOf[1]!.operator = "equal";
//         assert.isNull(automation.evaluate(now, sensorListMock, outputListMock));

//         // add a true any
//         conditions.anyOf = [new SensorCondition(2, 2, ReadingType.temperature, "less", 80)];
//         assert.equal(automation.evaluate(now, sensorListMock, outputListMock), 50);

//         // move that any to a oneOf
//         conditions.anyOf = [];
//         assert.isNull(automation.evaluate(now, sensorListMock, outputListMock));
//         conditions.oneOf = [new SensorCondition(2, 2, ReadingType.temperature, "less", 80)];
//         assert.equal(automation.evaluate(now, sensorListMock, outputListMock), 50);

//         // add a false oneOf
//         conditions.oneOf.push(new OutputCondition(2, 1, "less", 10));
//         assert.equal(automation.evaluate(now, sensorListMock, outputListMock), 50);

//         // add another true oneOf
//         conditions.oneOf.push(new OutputCondition(3, 1, "lessOrEqual", 51));
//         assert.isNull(automation.evaluate(now, sensorListMock, outputListMock));

//         //yeet allOfs
//         conditions.allOf = [];
//         assert.isNull(automation.evaluate(now, sensorListMock, outputListMock));

//         //AND (reset)
//         conditions = new AutomationConditions(
//           "and",
//           [
//             new SensorCondition(1, 1, ReadingType.temperature, "greater", 50),
//             new OutputCondition(1, 1, "greater", 50),
//           ],
//           [],
//           [],
//         );
//         automation = new Automation(1, "test", 50, conditions, "11:00");

//         // two true allOfs
//         now.setHours(10, 59);
//         assert.isNull(automation.evaluate(now, sensorListMock, outputListMock));
//         now.setHours(11, 0);
//         assert.equal(automation.evaluate(now, sensorListMock, outputListMock), 50);

//         // add a false anyOf
//         conditions.anyOf.push(
//           new SensorCondition(2, 1, ReadingType.temperature, "greaterOrEqual", 100),
//         );
//         assert.isNull(automation.evaluate(now, sensorListMock, outputListMock));
//         // make it a true anyOf
//         conditions.anyOf[0]!.operator = "notEqual";
//         assert.equal(automation.evaluate(now, sensorListMock, outputListMock), 50);

//         //add a false oneOf
//         conditions.oneOf.push(new OutputCondition(2, 1, "less", 10));
//         assert.isNull(automation.evaluate(now, sensorListMock, outputListMock));
//         //make it a true oneOf
//         conditions.oneOf[0]!.operator = "greaterOrEqual";
//         assert.equal(automation.evaluate(now, sensorListMock, outputListMock), 50);
//         // add a second true oneOf
//         conditions.oneOf.push(new OutputCondition(3, 1, "notEqual", 10));
//         assert.isNull(automation.evaluate(now, sensorListMock, outputListMock));
//       });
//     });
//   });

//   describe("isBetweenTimeStamp", () => {
//     it("should return true if the current time is between the start and end time", () => {
//       const startTime = "10:00";
//       const endTime = "12:00";
//       const now = new Date("2021-01-01T11:00:00");

//       const result = isBetweenTimeStamp(startTime, endTime, now);

//       assert.isTrue(result);
//     });

//     it("should return false if the current time is before the start time", () => {
//       const startTime = "10:00";
//       const endTime = "12:00";
//       const now = new Date("2021-01-01T09:00:00");

//       const result = isBetweenTimeStamp(startTime, endTime, now);

//       assert.isFalse(result);
//     });

//     it("should return false if the current time is after the end time", () => {
//       const startTime = "10:00";
//       const endTime = "12:00";
//       const now = new Date("2021-01-01T13:00:00");

//       const result = isBetweenTimeStamp(startTime, endTime, now);

//       assert.isFalse(result);
//     });

//     it("should return true if the current time is between the start and end time, crossing midnight", () => {
//       const startTime = "22:00";
//       const endTime = "02:00";
//       const now = new Date("2021-01-01T23:00:00");

//       const result = isBetweenTimeStamp(startTime, endTime, now);

//       assert.isTrue(result);
//     });

//     it("should return false if the current time is before the start time, crossing midnight", () => {
//       const startTime = "22:00";
//       const endTime = "02:00";
//       const now = new Date("2021-01-01T21:00:00");

//       const result = isBetweenTimeStamp(startTime, endTime, now);

//       assert.isFalse(result);
//     });

//     it("should return false if the current time is after the end time, crossing midnight", () => {
//       const startTime = "22:00";
//       const endTime = "02:00";
//       const now = new Date("2021-01-01T03:00:00");

//       const result = isBetweenTimeStamp(startTime, endTime, now);
//       assert.isFalse(result);
//     });
//   });
// });
